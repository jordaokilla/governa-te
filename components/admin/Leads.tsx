"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dateTime, phone } from "@/lib/format";
import { Empty, ErrorBox, errorText, Loading, PageTitle } from "./ui";

interface Row { id: string; kind: "waitlist" | "exhibitor" | "sponsor" | "contact"; product_name: string | null; name: string; company: string | null; email: string | null; phone: string | null; message: string | null; status: "new" | "contacted" | "won" | "lost"; admin_notes: string | null; created_at: string }
const KIND = { waitlist: "Lista de espera", exhibitor: "Expositor", sponsor: "Patrocínio", contact: "Contacto" };
const STATUS = { new: "Novo", contacted: "Contactado", won: "Fechado", lost: "Sem interesse" };

export function Leads() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState("all");

  const load = useCallback(async () => {
    let query = supabase().from("leads").select("*").order("created_at", { ascending: false }).limit(1000);
    if (kind !== "all") query = query.eq("kind", kind);
    const { data, error: err } = await query;
    if (err) setError(errorText(err));
    else {
      setRows(data as Row[]);
      setError(null);
    }
  }, [kind]);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function update(id: string, patch: Partial<Row>) {
    setRows((cur) => cur?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? null);
    const { error: err } = await supabase().from("leads").update(patch).eq("id", id);
    if (err) {
      setError(errorText(err));
      load();
    }
  }

  function exportCsv() {
    const csv = [["Data", "Tipo", "Nome", "Empresa", "Telemóvel", "Email", "Pacote", "Mensagem", "Estado"], ...(rows ?? []).map((r) => [dateTime(r.created_at), KIND[r.kind], r.name, r.company ?? "", r.phone ?? "", r.email ?? "", r.product_name ?? "", r.message ?? "", STATUS[r.status]])]
      .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "contactos-governa-te.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageTitle title="Contactos" text="Pedidos de proposta de expositores e patrocinadores e a lista de espera dos bilhetes.">
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!rows?.length}>Exportar CSV</button>
      </PageTitle>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Tipo de contacto">
        {[["all", "Todos"], ...Object.entries(KIND)].map(([k, label]) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`btn btn-sm ${kind === k ? "btn-gold" : "btn-ghost"}`}>{label}</button>
        ))}
      </div>
      {error && <div className="mb-3"><ErrorBox text={error} onRetry={load} /></div>}
      {!rows && !error && <Loading />}
      {rows && rows.length === 0 && <Empty text="Ainda não há contactos deste tipo." />}
      {rows && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-white">{r.name}{r.company ? ` · ${r.company}` : ""}</p>
                  <p className="mt-0.5 text-sm text-mute">{KIND[r.kind]}{r.product_name ? ` · ${r.product_name}` : ""} · {dateTime(r.created_at)}</p>
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {r.phone && <a className="text-gold hover:underline" href={`https://wa.me/${r.phone}`} target="_blank" rel="noopener noreferrer">WhatsApp {phone(r.phone)}</a>}
                    {r.email && <a className="text-gold hover:underline" href={`mailto:${r.email}`}>{r.email}</a>}
                  </p>
                </div>
                <select className="field min-h-10 w-auto py-2 text-sm" value={r.status} onChange={(e) => update(r.id, { status: e.target.value as Row["status"] })} aria-label={`Estado do contacto de ${r.name}`}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {r.message && <p className="mt-3 rounded-lg bg-coal p-3 text-sm whitespace-pre-line text-paper/85">{r.message}</p>}
              <label className="sr-only" htmlFor={`note-${r.id}`}>Notas internas</label>
              <input id={`note-${r.id}`} className="field mt-3 min-h-10 py-2 text-sm" placeholder="Notas internas (só a equipa vê)" defaultValue={r.admin_notes ?? ""} onBlur={(e) => { if (e.target.value !== (r.admin_notes ?? "")) update(r.id, { admin_notes: e.target.value }); }} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
