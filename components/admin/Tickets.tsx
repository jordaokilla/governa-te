"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dateTime } from "@/lib/format";
import { Empty, ErrorBox, errorText, Loading, PageTitle } from "./ui";

interface Row { id: string; code: string; holder_name: string; holder_phone: string | null; product_name: string; status: "valid" | "used" | "cancelled"; checked_in_at: string | null; checked_in_by: string | null; created_at: string }
const LABEL = { valid: "Válido", used: "Entrou", cancelled: "Cancelado" };
const CLS = { valid: "border-ok/50 text-ok", used: "border-gold/60 text-gold", cancelled: "border-ember/50 text-ember" };

export function Tickets() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase().from("tickets").select("id, code, holder_name, holder_phone, product_name, status, checked_in_at, checked_in_by, created_at").order("created_at", { ascending: false }).limit(2000);
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

  async function act(id: string, fn: () => PromiseLike<{ error: unknown }>) {
    setBusy(id);
    const { error: err } = await fn();
    setBusy(null);
    if (err) setError(errorText(err));
    else load();
  }

  const term = q.trim().toLowerCase();
  const shown = (rows ?? []).filter((r) => (filter === "all" || r.status === filter) && (!term || [r.code, r.holder_name, r.holder_phone, r.product_name].some((v) => (v ?? "").toLowerCase().includes(term))));

  function exportCsv() {
    const csv = [["Código", "Nome", "Bilhete", "Estado", "Entrada"], ...shown.map((r) => [r.code, r.holder_name, r.product_name, LABEL[r.status], r.checked_in_at ? dateTime(r.checked_in_at) : ""])]
      .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "bilhetes-governa-te.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageTitle title="Bilhetes" text="Todos os bilhetes emitidos. A validação à porta faz-se em «Entrada».">
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!shown.length}>Exportar lista</button>
      </PageTitle>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input className="field min-h-10 py-2 text-sm" placeholder="Procurar por nome, código ou telemóvel" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Procurar bilhetes" />
        <select className="field min-h-10 py-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Estado">
          <option value="all">Todos</option>
          <option value="valid">Válidos</option>
          <option value="used">Já entraram</option>
          <option value="cancelled">Cancelados</option>
        </select>
      </div>
      {error && <div className="mb-3"><ErrorBox text={error} onRetry={load} /></div>}
      {!rows && !error && <Loading />}
      {rows && shown.length === 0 && <Empty text={rows.length ? "Nenhum bilhete corresponde à procura." : "Ainda não há bilhetes emitidos. Aparecem aqui quando um pedido é pago."} />}
      {shown.length > 0 && (
        <ul className="space-y-2">
          {shown.map((r) => (
            <li key={r.id} className="card flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{r.holder_name}</p>
                <p className="mt-0.5 text-sm text-mute"><span className="font-mono text-paper/85">{r.code}</span> · {r.product_name}</p>
                {r.checked_in_at && <p className="mt-0.5 text-xs text-mute">Entrou em {dateTime(r.checked_in_at)}{r.checked_in_by ? ` · ${r.checked_in_by}` : ""}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${CLS[r.status]}`}>{LABEL[r.status]}</span>
                {r.status === "used" && (
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy === r.id} onClick={() => act(r.id, () => supabase().rpc("admin_undo_check_in", { p_ticket: r.id }))}>Anular entrada</button>
                )}
                {r.status === "valid" && (
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy === r.id} onClick={() => { if (window.confirm(`Cancelar o bilhete de ${r.holder_name}?`)) act(r.id, () => supabase().rpc("admin_set_ticket", { p_ticket: r.id, p_cancel: true })); }}>Cancelar</button>
                )}
                {r.status === "cancelled" && (
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy === r.id} onClick={() => act(r.id, () => supabase().rpc("admin_set_ticket", { p_ticket: r.id, p_cancel: false }))}>Reactivar</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
