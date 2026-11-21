"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { KIND_PLURAL, kz } from "@/lib/format";
import type { Kind } from "@/lib/types";
import { Empty, ErrorBox, errorText, Loading, Modal, PageTitle, refreshSite, Toggle } from "./ui";

interface Row {
  id: string; kind: Kind; name: string; tagline: string | null; description: string | null; benefits: string[];
  price: number | null; on_request: boolean; stock: number | null; max_per_order: number; tickets_per_unit: number;
  is_published: boolean; is_featured: boolean; sort_order: number;
}
type Draft = Omit<Row, "id" | "benefits" | "price" | "stock"> & { id?: string; benefits: string; price: string; stock: string };

const blank = (kind: Kind): Draft => ({ kind, name: "", tagline: "", description: "", benefits: "", price: "", on_request: false, stock: "", max_per_order: kind === "ticket" ? 10 : 1, tickets_per_unit: kind === "ticket" ? 1 : 0, is_published: false, is_featured: false, sort_order: 50 });
const toDraft = (r: Row): Draft => ({ ...r, benefits: r.benefits.join("\n"), price: r.price === null ? "" : String(Number(r.price)), stock: r.stock === null ? "" : String(r.stock) });

function Editor({ draft, onSaved, onClose }: { draft: Draft; onSaved: () => void; onClose: () => void }) {
  const [d, setD] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const price = d.price.trim() ? Number(d.price.replace(/\s/g, "").replace(",", ".")) : null;
    if (!d.name.trim()) return setError("Dê um nome ao pacote.");
    if (!d.on_request && !(price && price > 0)) return setError("Indique o preço em kwanzas ou marque «Sob proposta».");
    const stock = d.stock.trim() ? Number.parseInt(d.stock, 10) : null;
    if (stock !== null && !(stock >= 0)) return setError("O stock tem de ser um número.");
    const payload = {
      kind: d.kind, name: d.name.trim(), tagline: d.tagline?.trim() || null, description: d.description?.trim() || null,
      benefits: d.benefits.split("\n").map((b) => b.trim()).filter(Boolean),
      price: d.on_request ? null : price, on_request: d.on_request, stock,
      max_per_order: Math.min(Math.max(Number(d.max_per_order) || 1, 1), 100),
      tickets_per_unit: Math.min(Math.max(Number(d.tickets_per_unit) || 0, 0), 100),
      is_published: d.is_published, is_featured: d.is_featured, sort_order: Number(d.sort_order) || 0,
    };
    setBusy(true);
    const { error: err } = d.id ? await supabase().from("products").update(payload).eq("id", d.id) : await supabase().from("products").insert(payload);
    setBusy(false);
    if (err) return setError(errorText(err));
    await refreshSite();
    onSaved();
    onClose();
  }

  async function remove() {
    if (!d.id || !window.confirm(`Apagar «${d.name}»? Os pedidos já feitos mantêm-se.`)) return;
    setBusy(true);
    const { error: err } = await supabase().from("products").delete().eq("id", d.id);
    setBusy(false);
    if (err) return setError(errorText(err));
    await refreshSite();
    onSaved();
    onClose();
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="p-name">Nome</label>
        <input id="p-name" className="field" value={d.name} onChange={(e) => set("name", e.target.value)} required />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="p-tag">Frase curta</label>
        <input id="p-tag" className="field" value={d.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="p-desc">Descrição</label>
        <textarea id="p-desc" className="field min-h-20" value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="p-ben">O que inclui (uma linha por ponto)</label>
        <textarea id="p-ben" className="field min-h-28" value={d.benefits} onChange={(e) => set("benefits", e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="p-price">Preço (Kz)</label>
        <input id="p-price" className="field" inputMode="decimal" value={d.price} onChange={(e) => set("price", e.target.value)} disabled={d.on_request} />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 sm:mt-7">
        <span className="text-sm text-paper/85">Sob proposta (sem compra online)</span>
        <Toggle checked={d.on_request} onChange={(v) => set("on_request", v)} label="Sob proposta" />
      </div>
      <div>
        <label className="field-label" htmlFor="p-stock">Unidades à venda</label>
        <input id="p-stock" className="field" inputMode="numeric" placeholder="Sem limite" value={d.stock} onChange={(e) => set("stock", e.target.value)} />
        <p className="field-hint">Vazio = sem limite.</p>
      </div>
      <div>
        <label className="field-label" htmlFor="p-max">Máximo por pedido</label>
        <input id="p-max" className="field" type="number" min={1} max={100} value={d.max_per_order} onChange={(e) => set("max_per_order", Number(e.target.value))} />
      </div>
      <div>
        <label className="field-label" htmlFor="p-tpu">Bilhetes emitidos por unidade</label>
        <input id="p-tpu" className="field" type="number" min={0} max={100} value={d.tickets_per_unit} onChange={(e) => set("tickets_per_unit", Number(e.target.value))} />
        <p className="field-hint">Num bilhete é 1. Num pacote de parceiro, as credenciais ou bilhetes incluídos.</p>
      </div>
      <div>
        <label className="field-label" htmlFor="p-order">Ordem na página</label>
        <input id="p-order" className="field" type="number" value={d.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} />
        <p className="field-hint">Os números mais baixos aparecem primeiro.</p>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
        <span className="text-sm text-paper/85">Publicado no site</span>
        <Toggle checked={d.is_published} onChange={(v) => set("is_published", v)} label="Publicado no site" />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
        <span className="text-sm text-paper/85">Em destaque</span>
        <Toggle checked={d.is_featured} onChange={(v) => set("is_featured", v)} label="Em destaque" />
      </div>
      {error && <p className="text-sm text-ember sm:col-span-2" role="alert">{error}</p>}
      <div className="flex flex-wrap justify-between gap-2 sm:col-span-2">
        <button type="submit" className="btn btn-gold" disabled={busy}>{busy ? "A guardar…" : "Guardar"}</button>
        {d.id && <button type="button" className="btn btn-ghost" disabled={busy} onClick={remove}>Apagar</button>}
      </div>
    </form>
  );
}

export function Catalog() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase().from("products").select("*").order("sort_order").order("name");
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

  async function publish(r: Row, value: boolean) {
    setRows((cur) => cur?.map((x) => (x.id === r.id ? { ...x, is_published: value } : x)) ?? null);
    const { error: err } = await supabase().from("products").update({ is_published: value }).eq("id", r.id);
    if (err) {
      setError(errorText(err));
      load();
    } else refreshSite();
  }

  return (
    <>
      <PageTitle title="Catálogo" text="Bilhetes, espaços de expositor e categorias de patrocínio. Só o que está publicado aparece no site; a compra só funciona com as vendas abertas (Definições)." />
      {error && <div className="mb-3"><ErrorBox text={error} onRetry={load} /></div>}
      {!rows && !error && <Loading />}
      {rows && (["ticket", "exhibitor", "sponsor"] as Kind[]).map((kind) => {
        const list = rows.filter((r) => r.kind === kind);
        return (
          <section key={kind} className="mb-9">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg text-white">{KIND_PLURAL[kind]}</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(blank(kind))}>Acrescentar</button>
            </div>
            {list.length === 0 ? <Empty text="Ainda não há pacotes deste tipo." /> : (
              <ul className="space-y-2">
                {list.map((r) => (
                  <li key={r.id} className="card flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{r.name}</p>
                      <p className="mt-0.5 text-sm text-mute">
                        {r.on_request ? "Sob proposta" : kz(Number(r.price))} · {r.stock === null ? "sem limite" : `${r.stock} unidades`}
                        {r.tickets_per_unit > 0 && ` · ${r.tickets_per_unit} ${r.tickets_per_unit === 1 ? "bilhete" : "bilhetes"} por unidade`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-paper/70">{r.is_published ? "Publicado" : "Por publicar"}</span>
                      <Toggle checked={r.is_published} onChange={(v) => publish(r, v)} label={`Publicar ${r.name}`} />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(toDraft(r))}>Editar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <Modal open={!!editing} title={editing?.id ? "Editar pacote" : "Novo pacote"} onClose={() => setEditing(null)} wide>
        {editing && <Editor key={editing.id ?? "novo"} draft={editing} onSaved={load} onClose={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
