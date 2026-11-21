"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Empty, ErrorBox, errorText, Loading, Modal, PageTitle, refreshSite, Toggle } from "./ui";

interface Row {
  id: string; name: string; role: string; bio: string | null; section_label: string | null; topic_title: string | null;
  topic_description: string | null; takeaway: string | null; photo_url: string | null; silhouette_url: string | null;
  instagram: string | null; is_revealed: boolean; sort_order: number;
}
const blank: Omit<Row, "id"> & { id?: string } = { name: "", role: "Orador", bio: "", section_label: "Tema da intervenção", topic_title: "", topic_description: "", takeaway: "", photo_url: null, silhouette_url: null, instagram: "", is_revealed: false, sort_order: 100 };

/** Reduz a fotografia e cria a silhueta (mesma forma, toda a preto) para a fase «por revelar». */
async function prepareImages(file: File): Promise<{ photo: Blob; silhouette: Blob }> {
  const bitmap = await createImageBitmap(file);
  const W = 880, H = 1100;
  const scale = Math.min(W / bitmap.width, H / bitmap.height);
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, (W - w) / 2, H - h, w, h);
  const toBlob = () => new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Imagem inválida"))), "image/webp", 0.86));
  const photo = await toBlob();
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  const silhouette = await toBlob();
  return { photo, silhouette };
}

function Editor({ row, onSaved, onClose }: { row: typeof blank; onSaved: () => void; onClose: () => void }) {
  const [d, setD] = useState(row);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setD((cur) => ({ ...cur, [k]: v }));

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const { photo, silhouette } = await prepareImages(file);
      const id = crypto.randomUUID().replace(/-/g, "");
      const sid = crypto.randomUUID().replace(/-/g, "");
      const bucket = supabase().storage.from("equipa");
      const up1 = await bucket.upload(`${id}.webp`, photo, { contentType: "image/webp" });
      const up2 = await bucket.upload(`${sid}.webp`, silhouette, { contentType: "image/webp" });
      if (up1.error || up2.error) throw up1.error ?? up2.error;
      setD((cur) => ({ ...cur, photo_url: bucket.getPublicUrl(`${id}.webp`).data.publicUrl, silhouette_url: bucket.getPublicUrl(`${sid}.webp`).data.publicUrl }));
    } catch (err) {
      setError(`Não foi possível carregar a fotografia. ${errorText(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!d.name.trim() || !d.role.trim()) return setError("Nome e função são obrigatórios.");
    const payload = {
      name: d.name.trim(), role: d.role.trim(), bio: d.bio?.trim() || null, section_label: d.section_label?.trim() || null,
      topic_title: d.topic_title?.trim() || null, topic_description: d.topic_description?.trim() || null, takeaway: d.takeaway?.trim() || null,
      photo_url: d.photo_url, silhouette_url: d.silhouette_url, instagram: d.instagram?.trim().replace(/^@/, "") || null,
      is_revealed: d.is_revealed, sort_order: Number(d.sort_order) || 0,
    };
    setBusy(true);
    const { error: err } = d.id ? await supabase().from("team_members").update(payload).eq("id", d.id) : await supabase().from("team_members").insert(payload);
    setBusy(false);
    if (err) return setError(errorText(err));
    await refreshSite();
    onSaved();
    onClose();
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="field-label" htmlFor="t-name">Nome</label>
        <input id="t-name" className="field" value={d.name} onChange={(e) => set("name", e.target.value)} required />
      </div>
      <div>
        <label className="field-label" htmlFor="t-role">Função</label>
        <input id="t-role" className="field" value={d.role} onChange={(e) => set("role", e.target.value)} required />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="t-bio">Apresentação</label>
        <textarea id="t-bio" className="field min-h-24" value={d.bio ?? ""} onChange={(e) => set("bio", e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="t-label">Rótulo do tema</label>
        <input id="t-label" className="field" value={d.section_label ?? ""} onChange={(e) => set("section_label", e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="t-topic">Tema ou função</label>
        <input id="t-topic" className="field" value={d.topic_title ?? ""} onChange={(e) => set("topic_title", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="t-topicd">Descrição do tema</label>
        <textarea id="t-topicd" className="field min-h-20" value={d.topic_description ?? ""} onChange={(e) => set("topic_description", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="t-take">O que o participante leva</label>
        <input id="t-take" className="field" value={d.takeaway ?? ""} onChange={(e) => set("takeaway", e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="t-ig">Instagram (nome de utilizador)</label>
        <input id="t-ig" className="field" placeholder="governa_te" value={d.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="t-order">Ordem</label>
        <input id="t-order" className="field" type="number" value={d.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="t-photo">Fotografia</label>
        <div className="flex items-center gap-4">
          {d.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.photo_url} alt="" className="h-24 w-20 rounded-lg border border-line bg-coal object-contain object-bottom" />
          )}
          <input id="t-photo" type="file" accept="image/png,image/webp,image/jpeg" className="text-sm text-paper/80 file:mr-3 file:rounded-lg file:border-0 file:bg-raise file:px-3 file:py-2 file:text-sm file:text-white" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
        <p className="field-hint">Use um retrato com o fundo recortado (PNG transparente): a silhueta da fase «por revelar» é criada a partir dele.</p>
      </div>
      {error && <p className="text-sm text-ember sm:col-span-2" role="alert">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-gold" disabled={busy}>{busy ? "A guardar…" : "Guardar"}</button>
      </div>
    </form>
  );
}

export function Team() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<typeof blank | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase().from("team_members").select("*").order("sort_order");
    if (err) setError(errorText(err));
    else {
      setRows(data as Row[]);
      setError(null);
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function reveal(r: Row, value: boolean) {
    if (value && !window.confirm(`Revelar ${r.name} no site? O nome, a fotografia e o tema passam a ser públicos.`)) return;
    setRows((cur) => cur?.map((x) => (x.id === r.id ? { ...x, is_revealed: value } : x)) ?? null);
    const { error: err } = await supabase().from("team_members").update({ is_revealed: value }).eq("id", r.id);
    if (err) {
      setError(errorText(err));
      load();
    } else refreshSite();
  }

  return (
    <>
      <PageTitle title="Equipa" text="Quem não está revelado aparece no site só como silhueta, sem nome. Revele cada membro quando a campanha o anunciar.">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...blank })}>Acrescentar membro</button>
      </PageTitle>
      {error && <div className="mb-3"><ErrorBox text={error} onRetry={load} /></div>}
      {!rows && !error && <Loading />}
      {rows && rows.length === 0 && <Empty text="Ainda não há membros." />}
      {rows && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="card flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-4">
              <div className="flex min-w-0 items-center gap-4">
                {r.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photo_url} alt="" className="h-16 w-14 shrink-0 rounded-lg bg-coal object-contain object-bottom" />
                ) : <div className="h-16 w-14 shrink-0 rounded-lg bg-coal" />}
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{r.name}</p>
                  <p className="mt-0.5 truncate text-sm text-mute">{r.role}{r.topic_title ? ` · ${r.topic_title}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${r.is_revealed ? "text-ok" : "text-paper/70"}`}>{r.is_revealed ? "Revelado" : "Por revelar"}</span>
                <Toggle checked={r.is_revealed} onChange={(v) => reveal(r, v)} label={`Revelar ${r.name}`} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(r)}>Editar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!editing} title={editing?.id ? "Editar membro" : "Novo membro"} onClose={() => setEditing(null)} wide>
        {editing && <Editor key={editing.id ?? "novo"} row={editing} onSaved={load} onClose={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
