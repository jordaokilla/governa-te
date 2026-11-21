"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dateTime, KIND_LABEL, kz, phone, STATUS_LABEL } from "@/lib/format";
import type { Kind, OrderStatus } from "@/lib/types";
import { Empty, ErrorBox, errorText, Loading, Modal, PageTitle, StatusBadge } from "./ui";

interface Row {
  id: string;
  number: number;
  public_token: string;
  kind: Kind;
  product_name: string;
  quantity: number;
  amount: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  company_name: string | null;
  nif: string | null;
  notes: string | null;
  status: OrderStatus;
  payment_method: string | null;
  appypay_entity: string | null;
  appypay_reference: string | null;
  failure_reason: string | null;
  paid_at: string | null;
  paid_by: string | null;
  expires_at: string | null;
  created_at: string;
}
interface Payment { id: string; merchant_transaction_id: string; method: string; status: string; reference: string | null; message: string | null; created_at: string }

const METHOD: Record<string, string> = { express: "Multicaixa Express", referencia: "Referência", manual: "Confirmado à mão" };
const PAY_STATUS: Record<string, string> = { pending: "Pendente", paid: "Pago", failed: "Falhou", expired: "Expirou" };

function Detail({ row, onChanged }: { row: Row; onChanged: () => void }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/pedido?t=${row.public_token}`;

  useEffect(() => {
    let alive = true;
    supabase().from("payments").select("id, merchant_transaction_id, method, status, reference, message, created_at").eq("order_id", row.id).order("created_at", { ascending: false })
      .then(({ data }) => alive && setPayments((data as Payment[]) ?? []));
    return () => {
      alive = false;
    };
  }, [row.id]);

  async function run(fn: () => PromiseLike<{ error: unknown }>, ok: string) {
    setBusy(true);
    setMsg(null);
    const { error } = await fn();
    setBusy(false);
    if (error) setMsg(errorText(error));
    else {
      setMsg(ok);
      onChanged();
    }
  }

  const line = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b border-white/5 py-2.5 text-sm last:border-0">
      <dt className="shrink-0 text-mute">{k}</dt>
      <dd className="text-right break-words text-white">{v}</dd>
    </div>
  );

  return (
    <div className="space-y-5">
      <dl>
        {line("Estado", <StatusBadge status={row.status} label={STATUS_LABEL[row.status]} />)}
        {line("Artigo", `${row.quantity} × ${row.product_name}`)}
        {line("Total", kz(Number(row.amount)))}
        {line("Comprador", row.buyer_name)}
        {line("Telemóvel", phone(row.buyer_phone))}
        {line("Email", row.buyer_email || "—")}
        {row.company_name && line("Empresa", row.company_name)}
        {row.nif && line("NIF", row.nif)}
        {line("Pagamento", row.payment_method ? METHOD[row.payment_method] ?? row.payment_method : "Por escolher")}
        {row.appypay_reference && line("Referência", `${row.appypay_entity ?? ""} · ${row.appypay_reference}`)}
        {row.paid_at && line("Pago em", `${dateTime(row.paid_at)}${row.paid_by ? ` (${row.paid_by === "appypay" ? "AppyPay" : row.paid_by})` : ""}`)}
        {row.status !== "paid" && row.expires_at && line("Reserva até", dateTime(row.expires_at))}
        {row.failure_reason && line("Última falha", row.failure_reason)}
        {row.notes && line("Notas", <span className="whitespace-pre-line">{row.notes}</span>)}
        {line("Criado em", dateTime(row.created_at))}
      </dl>

      <div>
        <p className="field-label">Ligação do pedido (para enviar ao cliente)</p>
        <div className="flex gap-2">
          <input className="field min-h-10 py-2 text-sm" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Ligação do pedido" />
          <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={async () => { await navigator.clipboard.writeText(link).catch(() => undefined); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? "Copiada" : "Copiar"}
          </button>
        </div>
      </div>

      {payments.length > 0 && (
        <div>
          <p className="field-label">Tentativas de pagamento</p>
          <ul className="divide-y divide-white/5 rounded-xl border border-line text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                <span className="text-paper/85">{METHOD[p.method] ?? p.method} · {dateTime(p.created_at)}</span>
                <span className={p.status === "paid" ? "text-ok" : p.status === "failed" ? "text-ember" : "text-gold"}>{PAY_STATUS[p.status] ?? p.status}</span>
                {p.message && <span className="w-full text-xs text-mute">{p.message}</span>}
                <span className="w-full font-mono text-[11px] text-mute">{p.merchant_transaction_id}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {row.status !== "paid" && (
        <div className="space-y-3 border-t border-white/10 pt-5">
          <label className="field-label" htmlFor="paid-note">Confirmar pagamento à mão</label>
          <input id="paid-note" className="field min-h-10 py-2 text-sm" placeholder="Como foi pago (por exemplo: transferência de 12/03, talão n.º 123)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-gold btn-sm" disabled={busy || note.trim().length < 3}
              onClick={() => run(() => supabase().rpc("admin_mark_order_paid", { p_order: row.id, p_note: note }), "Pedido marcado como pago.")}>
              Marcar como pago
            </button>
            {row.status !== "cancelled" && (
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
                onClick={() => { if (window.confirm("Cancelar este pedido? O lugar deixa de estar reservado.")) run(() => supabase().rpc("admin_cancel_order", { p_order: row.id }), "Pedido cancelado."); }}>
                Cancelar pedido
              </button>
            )}
          </div>
          <p className="field-hint">Marcar como pago emite os bilhetes do pedido. Use só quando o dinheiro já entrou.</p>
        </div>
      )}
      {msg && <p className="text-sm text-gold" role="status">{msg}</p>}
    </div>
  );
}

function NewCharge({ onCreated }: { onCreated: () => void }) {
  const [f, setF] = useState({ kind: "sponsor" as Kind, description: "", amount: "", name: "", email: "", phone: "", company: "", nif: "", tickets: "0" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((v) => ({ ...v, [k]: e.target.value }));

  if (link) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-paper/85">Cobrança criada. Envie esta ligação ao cliente: ele escolhe Multicaixa Express ou referência e paga.</p>
        <input className="field text-sm" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Ligação de pagamento" />
        <button type="button" className="btn btn-gold btn-sm" onClick={() => navigator.clipboard.writeText(link).catch(() => undefined)}>Copiar ligação</button>
      </div>
    );
  }
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const amount = Number(f.amount.replace(/\s/g, "").replace(",", "."));
        if (!(amount > 0)) return setError("Indique o valor em kwanzas.");
        setBusy(true);
        const { data, error: err } = await supabase().rpc("admin_create_charge", {
          p_kind: f.kind, p_description: f.description, p_amount: amount, p_name: f.name, p_email: f.email,
          p_phone: f.phone, p_company: f.company, p_nif: f.nif, p_tickets: Number.parseInt(f.tickets || "0", 10) || 0,
        });
        setBusy(false);
        if (err) return setError(errorText(err));
        setLink(`${window.location.origin}/pedido?t=${data}`);
        onCreated();
      }}
    >
      <div>
        <label className="field-label" htmlFor="nc-kind">Tipo</label>
        <select id="nc-kind" className="field" value={f.kind} onChange={set("kind")}>
          <option value="sponsor">Patrocínio</option>
          <option value="exhibitor">Expositor</option>
          <option value="ticket">Bilhetes</option>
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="nc-amount">Valor (Kz)</label>
        <input id="nc-amount" className="field" inputMode="decimal" value={f.amount} onChange={set("amount")} required />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="nc-desc">Descrição (aparece no pedido)</label>
        <input id="nc-desc" className="field" placeholder="Patrocínio Ouro — condições da proposta de Março" value={f.description} onChange={set("description")} required />
      </div>
      <div>
        <label className="field-label" htmlFor="nc-name">Nome do contacto</label>
        <input id="nc-name" className="field" value={f.name} onChange={set("name")} required />
      </div>
      <div>
        <label className="field-label" htmlFor="nc-company">Empresa</label>
        <input id="nc-company" className="field" value={f.company} onChange={set("company")} />
      </div>
      <div>
        <label className="field-label" htmlFor="nc-phone">Telemóvel</label>
        <input id="nc-phone" className="field" type="tel" value={f.phone} onChange={set("phone")} />
      </div>
      <div>
        <label className="field-label" htmlFor="nc-email">Email</label>
        <input id="nc-email" className="field" type="email" value={f.email} onChange={set("email")} />
      </div>
      <div>
        <label className="field-label" htmlFor="nc-nif">NIF</label>
        <input id="nc-nif" className="field" value={f.nif} onChange={set("nif")} />
      </div>
      <div>
        <label className="field-label" htmlFor="nc-tickets">Bilhetes incluídos</label>
        <input id="nc-tickets" className="field" type="number" min={0} max={100} value={f.tickets} onChange={set("tickets")} />
      </div>
      {error && <p className="text-sm text-ember sm:col-span-2" role="alert">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-gold" disabled={busy}>{busy ? "A criar…" : "Criar ligação de pagamento"}</button>
      </div>
    </form>
  );
}

export function Orders() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    let query = supabase().from("orders").select("*").order("created_at", { ascending: false }).limit(300);
    if (status !== "all") query = query.eq("status", status);
    if (kind !== "all") query = query.eq("kind", kind);
    const { data, error: err } = await query;
    if (err) setError(errorText(err));
    else {
      setRows(data as Row[]);
      setError(null);
      setOpen((cur) => (cur ? (data as Row[]).find((r) => r.id === cur.id) ?? cur : null));
    }
  }, [status, kind]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const term = q.trim().toLowerCase();
  const shown = (rows ?? []).filter((r) =>
    !term || [r.buyer_name, r.buyer_email, r.buyer_phone, r.company_name, String(r.number), r.product_name, r.appypay_reference].some((v) => (v ?? "").toLowerCase().includes(term)));

  function exportCsv() {
    const head = ["Pedido", "Data", "Estado", "Tipo", "Artigo", "Quantidade", "Total", "Nome", "Telemóvel", "Email", "Empresa", "NIF", "Pagamento"];
    const lines = shown.map((r) => [r.number, dateTime(r.created_at), STATUS_LABEL[r.status], KIND_LABEL[r.kind], r.product_name, r.quantity, Number(r.amount), r.buyer_name, r.buyer_phone, r.buyer_email, r.company_name ?? "", r.nif ?? "", r.payment_method ? METHOD[r.payment_method] : ""]);
    const csv = [head, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "pedidos-governa-te.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageTitle title="Pedidos" text="Compras de bilhetes, espaços de expositor e patrocínios. Abra um pedido para ver o pagamento ou confirmar à mão.">
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!shown.length}>Exportar CSV</button>
        <button type="button" className="btn btn-gold btn-sm" onClick={() => setCreating(true)}>Nova cobrança</button>
      </PageTitle>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input className="field min-h-10 py-2 text-sm" placeholder="Procurar por nome, telemóvel, email, n.º ou referência" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Procurar pedidos" />
        <select className="field min-h-10 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
          <option value="all">Todos os estados</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="field min-h-10 py-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Tipo">
          <option value="all">Todos os tipos</option>
          {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {error && <ErrorBox text={error} onRetry={load} />}
      {!rows && !error && <Loading />}
      {rows && shown.length === 0 && <Empty text={rows.length ? "Nenhum pedido corresponde à procura." : "Ainda não há pedidos."} />}
      {shown.length > 0 && (
        <ul className="space-y-2">
          {shown.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setOpen(r)} className="card flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4 text-left transition hover:border-gold/50">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-white">{r.buyer_name}{r.company_name ? ` · ${r.company_name}` : ""}</span>
                  <span className="mt-0.5 block truncate text-sm text-mute">N.º {r.number} · {r.quantity} × {r.product_name} · {dateTime(r.created_at)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-display font-semibold text-white">{kz(Number(r.amount))}</span>
                  <StatusBadge status={r.status} label={STATUS_LABEL[r.status]} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!open} title={open ? `Pedido n.º ${open.number}` : ""} onClose={() => setOpen(null)}>
        {open && <Detail key={open.id} row={open} onChanged={load} />}
      </Modal>
      <Modal open={creating} title="Nova cobrança" onClose={() => setCreating(false)}>
        {creating && <NewCharge onCreated={load} />}
      </Modal>
    </>
  );
}
