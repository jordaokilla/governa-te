"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { api, fetchSite } from "@/lib/api";
import { KIND_LABEL, kz, validEmail, validPhone } from "@/lib/format";
import type { PayMethod, Product, Settings } from "@/lib/types";
import { PaymentMethod } from "./PaymentMethod";

const BACK = { ticket: "/bilhetes", exhibitor: "/expositores", sponsor: "/patrocinadores" } as const;

function Notice({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <h1 className="font-display text-2xl text-white">{title}</h1>
      <p className="mt-3 text-[15px] text-paper/80">{text}</p>
      <Link href={href} className="btn btn-gold mt-7">{cta}</Link>
    </div>
  );
}

export function CheckoutForm() {
  const params = useSearchParams();
  const router = useRouter();
  const productId = params.get("p") ?? "";

  const [state, setState] = useState<{ loading: boolean; product?: Product; settings?: Settings; error?: string }>({ loading: true });
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", nif: "", notes: "" });
  const [method, setMethod] = useState<PayMethod>("express");
  const [payPhone, setPayPhone] = useState("");
  const [payPhoneTouched, setPayPhoneTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchSite()
      .then((site) => {
        if (!alive) return;
        setState({ loading: false, settings: site.settings, product: site.products.find((p) => p.id === productId) });
      })
      .catch((err) => alive && setState({ loading: false, error: err instanceof Error ? err.message : "Erro" }));
    return () => {
      alive = false;
    };
  }, [productId]);

  const product = state.product;
  const max = useMemo(() => {
    if (!product) return 1;
    return Math.max(1, Math.min(product.max_per_order, product.remaining ?? product.max_per_order));
  }, [product]);
  const business = product ? product.kind !== "ticket" : false;

  if (state.loading) {
    return <div className="card mx-auto h-96 max-w-4xl animate-pulse" role="status" aria-label="A carregar" />;
  }
  if (state.error) {
    return <Notice title="Não foi possível carregar" text={state.error} href="/bilhetes" cta="Voltar aos bilhetes" />;
  }
  if (!product || product.on_request || product.price === null) {
    return <Notice title="Pacote indisponível" text="Este pacote já não está à venda online." href="/bilhetes" cta="Ver bilhetes" />;
  }
  if (!state.settings?.sales_open) {
    return <Notice title="As vendas ainda não abriram" text="Deixe o seu contacto na página dos bilhetes e avisamos assim que abrirem." href="/bilhetes" cta="Ver bilhetes" />;
  }
  if (product.remaining !== null && product.remaining <= 0) {
    return <Notice title="Esgotado" text={`${product.name} já não tem unidades disponíveis.`} href={BACK[product.kind]} cta="Ver outras opções" />;
  }

  const total = product.price * quantity;
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "phone" && !payPhoneTouched) setPayPhone(value);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length < 3) return setError("Indique o seu nome completo.");
    if (!validEmail(form.email)) return setError("Indique um email válido: é para lá que segue a confirmação.");
    if (!validPhone(form.phone)) return setError("Indique um telemóvel válido, com nove algarismos (9XX XXX XXX).");
    if (business && form.company.trim().length < 2) return setError("Indique o nome da empresa ou instituição.");
    if (method === "express" && !validPhone(payPhone)) return setError("Indique o número do Multicaixa Express que vai pagar.");

    const utm: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const v = params.get(k);
      if (v) utm[k] = v;
    }
    setBusy(true);
    try {
      const res = await api.checkout({
        product_id: product!.id,
        quantity,
        ...form,
        method,
        pay_phone: method === "express" ? payPhone : undefined,
        utm,
      });
      router.push(`/pedido?t=${res.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro. Tente de novo.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <div className="card space-y-7 p-6 sm:p-8">
        <div>
          <p className="eyebrow">{KIND_LABEL[product.kind]}</p>
          <h1 className="mt-2 font-display text-2xl font-medium text-white sm:text-3xl">{product.name}</h1>
          {product.tagline && <p className="mt-1 text-sm text-gold">{product.tagline}</p>}
        </div>

        {max > 1 && (
          <div>
            <span className="field-label" id="qty-label">Quantidade</span>
            <div className="inline-flex items-center rounded-xl border border-line bg-coal" role="group" aria-labelledby="qty-label">
              <button type="button" className="flex h-12 w-12 items-center justify-center text-paper disabled:opacity-30" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Menos um">
                <Minus size={18} />
              </button>
              <output className="w-12 text-center font-display text-lg font-semibold text-white" aria-live="polite">{quantity}</output>
              <button type="button" className="flex h-12 w-12 items-center justify-center text-paper disabled:opacity-30" onClick={() => setQuantity((q) => Math.min(max, q + 1))} disabled={quantity >= max} aria-label="Mais um">
                <Plus size={18} />
              </button>
            </div>
            <p className="field-hint">Máximo de {max} por pedido.</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="c-name">Nome completo</label>
            <input id="c-name" className="field" autoComplete="name" value={form.name} onChange={set("name")} required />
          </div>
          <div>
            <label className="field-label" htmlFor="c-email">Email</label>
            <input id="c-email" className="field" type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
          </div>
          <div>
            <label className="field-label" htmlFor="c-phone">Telemóvel</label>
            <input id="c-phone" className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="9XX XXX XXX" value={form.phone} onChange={set("phone")} required />
          </div>
          <div>
            <label className="field-label" htmlFor="c-company">Empresa{!business && <span className="text-mute"> (opcional)</span>}</label>
            <input id="c-company" className="field" autoComplete="organization" value={form.company} onChange={set("company")} required={business} />
          </div>
          <div>
            <label className="field-label" htmlFor="c-nif">NIF <span className="text-mute">(opcional)</span></label>
            <input id="c-nif" className="field" inputMode="text" value={form.nif} onChange={set("nif")} maxLength={20} />
          </div>
          {business && (
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="c-notes">Observações <span className="text-mute">(opcional)</span></label>
              <textarea id="c-notes" className="field min-h-24" value={form.notes} onChange={set("notes")} maxLength={600} />
            </div>
          )}
        </div>

        <PaymentMethod
          method={method}
          onMethod={setMethod}
          payPhone={payPhone}
          onPayPhone={(v) => {
            setPayPhoneTouched(true);
            setPayPhone(v);
          }}
        />
      </div>

      <aside className="card p-6 sm:p-7 lg:sticky lg:top-24">
        <h2 className="font-display text-lg text-white">Resumo</h2>
        <dl className="mt-4 space-y-3 text-[15px]">
          <div className="flex justify-between gap-4">
            <dt className="text-paper/75">{quantity} × {product.name}</dt>
            <dd className="shrink-0 text-white">{kz(total)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-4">
            <dt className="font-display font-semibold text-white">Total</dt>
            <dd className="font-display text-2xl font-semibold text-gold">{kz(total)}</dd>
          </div>
        </dl>
        {product.tickets_per_unit > 0 && (
          <p className="mt-4 text-sm text-paper/70">
            Inclui {product.tickets_per_unit * quantity} {product.tickets_per_unit * quantity === 1 ? "bilhete digital" : "bilhetes digitais"} com código QR.
          </p>
        )}
        {error && <p className="mt-4 text-sm text-ember" role="alert">{error}</p>}
        <button type="submit" className="btn btn-gold mt-6 w-full" disabled={busy}>
          {busy ? "A preparar o pagamento…" : method === "express" ? `Pagar ${kz(total)}` : "Gerar referência"}
        </button>
        <p className="mt-4 text-xs leading-relaxed text-mute">
          Pagamento processado pela AppyPay. O lugar fica reservado enquanto o pagamento estiver dentro do prazo.
        </p>
      </aside>
    </form>
  );
}
