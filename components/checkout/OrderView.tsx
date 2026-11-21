"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, Copy, Loader2, XCircle } from "lucide-react";
import { api, fetchSite } from "@/lib/api";
import { dateTimeLong, kz, phone as fmtPhone, validPhone } from "@/lib/format";
import type { Order, PayMethod, Settings, Ticket } from "@/lib/types";
import { eventWhen, eventWhere } from "@/components/site/EventFacts";
import { PaymentMethod } from "./PaymentMethod";
import { TicketCard } from "./TicketCard";

function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 py-4 last:border-0">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-mute">{label}</p>
        <p className="mt-1 font-mono text-2xl font-semibold tracking-wider text-white">{value}</p>
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value.replace(/\s/g, ""));
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            /* sem área de transferência: o valor está visível */
          }
        }}
      >
        <Copy size={14} aria-hidden />
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function Summary({ order }: { order: Order }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      <div><dt className="text-mute">Pedido</dt><dd className="mt-0.5 text-white">N.º {order.number}</dd></div>
      <div><dt className="text-mute">Total</dt><dd className="mt-0.5 font-display text-lg font-semibold text-gold">{kz(order.amount)}</dd></div>
      <div><dt className="text-mute">Artigo</dt><dd className="mt-0.5 text-white">{order.quantity} × {order.product_name}</dd></div>
      <div><dt className="text-mute">Comprador</dt><dd className="mt-0.5 break-words text-white">{order.buyer_name}</dd></div>
    </dl>
  );
}

function HolderEditor({ token, ticket, onSaved }: { token: string; ticket: Ticket; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(ticket.holder_name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!editing) {
    return (
      <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
        {ticket.status === "valid" && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Mudar o nome</button>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            const url = `${window.location.origin}/bilhete?t=${ticket.public_token}`;
            try {
              if (navigator.share) await navigator.share({ title: "Bilhete GOVERNA-TE", url });
              else {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }
            } catch {
              /* partilha cancelada */
            }
          }}
        >
          {copied ? "Ligação copiada" : "Partilhar bilhete"}
        </button>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (name.trim().length < 3) return setError("Indique o nome completo.");
        setBusy(true);
        try {
          await api.setHolder(token, ticket.id, name);
          setEditing(false);
          onSaved();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Não foi possível guardar.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="sr-only" htmlFor={`holder-${ticket.id}`}>Nome de quem vai usar o bilhete</label>
      <input id={`holder-${ticket.id}`} className="field min-h-10 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <button type="submit" className="btn btn-gold btn-sm" disabled={busy}>{busy ? "A guardar…" : "Guardar"}</button>
      {error && <p className="text-xs text-ember" role="alert">{error}</p>}
    </form>
  );
}

function PayAgain({ order, onStarted }: { order: Order; onStarted: (o: Order) => void }) {
  const [method, setMethod] = useState<PayMethod>(order.payment_method === "referencia" ? "referencia" : "express");
  const [payPhone, setPayPhone] = useState(fmtPhone(order.buyer_phone));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (method === "express" && !validPhone(payPhone)) return setError("Indique o número do Multicaixa Express que vai pagar.");
        setBusy(true);
        try {
          const res = await api.checkout({ token: order.token, method, pay_phone: method === "express" ? payPhone : undefined });
          onStarted(res.order);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Ocorreu um erro. Tente de novo.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <PaymentMethod method={method} onMethod={setMethod} payPhone={payPhone} onPayPhone={setPayPhone} idPrefix="again" />
      {error && <p className="text-sm text-ember" role="alert">{error}</p>}
      <button type="submit" className="btn btn-gold w-full sm:w-auto" disabled={busy}>
        {busy ? "A preparar o pagamento…" : method === "express" ? `Pagar ${kz(order.amount)}` : "Gerar referência"}
      </button>
    </form>
  );
}

export function OrderView() {
  const token = useSearchParams().get("t") ?? "";
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [polls, setPolls] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.order(token);
      setOrder(res.order);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  }, [token]);

  useEffect(() => {
    if (!/^[a-f0-9]{32}$/.test(token)) return;
    const first = setTimeout(load, 0);
    fetchSite().then((s) => setSettings(s.settings)).catch(() => undefined);
    return () => clearTimeout(first);
  }, [token, load]);

  // Enquanto o pagamento está em curso, pergunta pelo estado: mais vezes no Express, menos na referência.
  const status = order?.status;
  const method = order?.payment_method;
  useEffect(() => {
    if (status !== "processing") return;
    const every = method === "express" ? 4000 : 15000;
    const id = setInterval(() => {
      load();
      setPolls((n) => n + 1);
    }, every);
    return () => clearInterval(id);
  }, [status, method, load]);

  if (!/^[a-f0-9]{32}$/.test(token) || (error && !order)) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <h1 className="font-display text-2xl text-white">Pedido não encontrado</h1>
        <p className="mt-3 text-[15px] text-paper/80">{error ?? "A ligação deste pedido não é válida."}</p>
        <Link href="/meus-bilhetes" className="btn btn-gold mt-7">Procurar os meus bilhetes</Link>
      </div>
    );
  }
  if (!order) return <div className="card mx-auto h-80 max-w-2xl animate-pulse" role="status" aria-label="A carregar o pedido" />;

  const when = settings ? eventWhen(settings) : undefined;
  const where = settings ? eventWhere(settings) : undefined;
  const waitedLong = polls >= 18; // cerca de 70 segundos no Multicaixa Express

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {order.status === "paid" && (
        <>
          <div className="card border-ok/40 p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 shrink-0 text-ok" size={26} aria-hidden />
              <div>
                <h1 className="font-display text-2xl font-medium text-white">Pagamento confirmado</h1>
                <p className="mt-2 text-[15px] leading-relaxed text-paper/80">
                  {order.tickets.length > 0
                    ? `Obrigado, ${order.buyer_name.split(" ")[0]}. ${order.tickets.length === 1 ? "O seu bilhete está pronto" : `Os seus ${order.tickets.length} bilhetes estão prontos`}: apresente o código QR à entrada. Guarde esta página.`
                    : `Obrigado, ${order.buyer_name.split(" ")[0]}. A organização entra em contacto consigo para os passos seguintes.`}
                </p>
              </div>
            </div>
            <div className="mt-6 border-t border-white/10 pt-5"><Summary order={order} /></div>
          </div>
          {order.tickets.map((t) => (
            <TicketCard key={t.id} code={t.code} holder={t.holder_name} product={t.product_name} status={t.status} when={when} where={where}>
              <HolderEditor token={order.token} ticket={t} onSaved={load} />
            </TicketCard>
          ))}
          {order.tickets.length > 0 && (
            <button type="button" className="btn btn-ghost no-print w-full sm:w-auto" onClick={() => window.print()}>Imprimir bilhetes</button>
          )}
        </>
      )}

      {order.status === "processing" && order.payment_method === "express" && !changing && (
        <div className="card p-6 sm:p-8" role="status">
          <div className="flex items-start gap-3">
            <Loader2 className="mt-1 shrink-0 animate-spin text-gold" size={26} aria-hidden />
            <div>
              <h1 className="font-display text-2xl font-medium text-white">Confirme o pagamento no telemóvel</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-paper/80">
                Enviámos o pedido de {kz(order.amount)} para a aplicação Multicaixa Express. Abra-a, confirme com o PIN e aguarde:
                esta página actualiza sozinha.
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-white/10 pt-5"><Summary order={order} /></div>
          {waitedLong && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-sm text-paper/75">Não recebeu o pedido no telemóvel?</p>
              <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => setChanging(true)}>Tentar de outra forma</button>
            </div>
          )}
        </div>
      )}

      {order.status === "processing" && order.payment_method === "referencia" && !changing && (
        <div className="card p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <Clock className="mt-1 shrink-0 text-gold" size={26} aria-hidden />
            <div>
              <h1 className="font-display text-2xl font-medium text-white">Pague por referência</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-paper/80">
                Num Multicaixa, no Multicaixa Express ou no internet banking, escolha «Pagamentos» e depois «Pagamento por referência».
              </p>
            </div>
          </div>
          {order.failure_reason && <p className="mt-4 text-sm text-ember">{order.failure_reason}</p>}
          {order.reference ? (
            <div className="mt-5 rounded-xl border border-line bg-coal px-5">
              <CopyValue label="Entidade" value={order.entity ?? ""} />
              <CopyValue label="Referência" value={order.reference.replace(/(\d{3})(?=\d)/g, "$1 ")} />
              <CopyValue label="Valor" value={kz(order.amount)} />
            </div>
          ) : (
            <p className="mt-5 inline-flex items-center gap-2 text-sm text-paper/80"><Loader2 size={16} className="animate-spin" aria-hidden />A gerar a referência…</p>
          )}
          {order.reference_due_at && (
            <p className="mt-4 text-sm text-paper/75">Válida até {dateTimeLong(order.reference_due_at)}. A reserva mantém-se até lá.</p>
          )}
          <p className="mt-2 text-sm text-paper/75">Depois de pagar, esta página passa a mostrar a confirmação. Pode fechá-la e voltar mais tarde pela mesma ligação.</p>
          <div className="mt-6 border-t border-white/10 pt-5"><Summary order={order} /></div>
          <button type="button" className="btn btn-ghost btn-sm mt-6" onClick={() => setChanging(true)}>Pagar com Multicaixa Express</button>
        </div>
      )}

      {(order.status === "awaiting_payment" || (order.status === "processing" && changing)) && (
        <div className="card p-6 sm:p-8">
          <h1 className="font-display text-2xl font-medium text-white">
            {order.failure_reason ? "O pagamento não foi concluído" : "Conclua o pagamento"}
          </h1>
          {order.failure_reason && <p className="mt-2 text-[15px] text-ember" role="alert">{order.failure_reason}</p>}
          <p className="mt-2 text-[15px] text-paper/80">
            {order.expires_at ? `O pedido fica reservado até ${dateTimeLong(order.expires_at)}.` : "Escolha como quer pagar."}
          </p>
          <div className="my-6 border-y border-white/10 py-5"><Summary order={order} /></div>
          <PayAgain
            order={order}
            onStarted={(o) => {
              setPolls(0);
              setChanging(false);
              setOrder(o);
            }}
          />
        </div>
      )}

      {(order.status === "expired" || order.status === "cancelled") && (
        <div className="card p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <XCircle className="mt-1 shrink-0 text-ember" size={26} aria-hidden />
            <div>
              <h1 className="font-display text-2xl font-medium text-white">
                {order.status === "expired" ? "O prazo deste pedido terminou" : "Este pedido foi cancelado"}
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-paper/80">
                O lugar deixou de estar reservado. Se já tinha pago, fale com a organização e indique o pedido n.º {order.number}.
              </p>
            </div>
          </div>
          <Link href={order.kind === "ticket" ? "/bilhetes" : order.kind === "exhibitor" ? "/expositores" : "/patrocinadores"} className="btn btn-gold mt-6">Fazer um pedido novo</Link>
        </div>
      )}
    </div>
  );
}
