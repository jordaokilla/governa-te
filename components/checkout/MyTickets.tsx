"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { dateTime, kz, STATUS_LABEL, validEmail, validPhone } from "@/lib/format";

type Found = Awaited<ReturnType<typeof api.myTickets>>["orders"];

export function MyTickets() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Found | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validEmail(email) || !validPhone(phone)) return setError("Indique o email e o telemóvel que usou na compra.");
    setBusy(true);
    try {
      setOrders((await api.myTickets(email, phone)).orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <form onSubmit={submit} noValidate className="card space-y-4 p-6 sm:p-8">
        <div>
          <label className="field-label" htmlFor="mt-email">Email usado na compra</label>
          <input id="mt-email" className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="mt-phone">Telemóvel usado na compra</label>
          <input id="mt-phone" className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="9XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {error && <p className="text-sm text-ember" role="alert">{error}</p>}
        <button type="submit" className="btn btn-gold w-full sm:w-auto" disabled={busy}>{busy ? "A procurar…" : "Procurar"}</button>
      </form>

      {orders && orders.length === 0 && (
        <p className="card p-6 text-[15px] text-paper/80" role="status">
          Não encontrámos pedidos com esse email e esse telemóvel. Confirme os dados ou fale com a organização.
        </p>
      )}
      {orders && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.public_token}>
              <Link href={`/pedido?t=${o.public_token}`} className="card flex items-center justify-between gap-4 p-5 transition hover:border-gold/60">
                <span>
                  <span className="block font-display text-[15px] font-semibold text-white">{o.quantity} × {o.product_name}</span>
                  <span className="mt-1 block text-sm text-mute">Pedido n.º {o.number} · {dateTime(o.created_at)}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm text-white">{kz(o.amount)}</span>
                  <span className={`mt-1 block text-xs font-medium ${o.status === "paid" ? "text-ok" : "text-gold"}`}>{STATUS_LABEL[o.status]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
