"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { validEmail, validPhone } from "@/lib/format";

interface Props {
  kind: "waitlist" | "exhibitor" | "sponsor" | "contact";
  /** Texto do botão. */
  submitLabel: string;
  /** Mensagem depois de enviado. */
  doneText: string;
  products?: { id: string; name: string }[];
}

/** Formulário de contacto: lista de espera dos bilhetes e pedidos de proposta de parceiros. */
export function LeadForm({ kind, submitLabel, doneText, products = [] }: Props) {
  const params = useSearchParams();
  const preset = params.get("pacote") ?? "";
  const business = kind === "exhibitor" || kind === "sponsor";
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", message: "", product_id: products.some((p) => p.id === preset) ? preset : "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length < 3) return setError("Indique o seu nome.");
    if (!validPhone(form.phone)) return setError("Indique um telemóvel válido, com nove algarismos (9XX XXX XXX).");
    if ((business || form.email) && !validEmail(form.email)) return setError("Indique um email válido.");
    if (business && form.company.trim().length < 2) return setError("Indique o nome da empresa ou instituição.");
    setBusy(true);
    try {
      await api.lead({ kind, ...form });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card flex items-start gap-3 p-6" role="status">
        <CheckCircle2 className="mt-0.5 shrink-0 text-ok" aria-hidden />
        <div>
          <p className="font-display text-lg text-white">Pedido recebido</p>
          <p className="mt-1 text-[15px] text-paper/80">{doneText}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card grid gap-4 p-6 sm:grid-cols-2 sm:p-7" noValidate>
      <div className={business ? "" : "sm:col-span-2"}>
        <label className="field-label" htmlFor={`${kind}-name`}>Nome</label>
        <input id={`${kind}-name`} className="field" autoComplete="name" value={form.name} onChange={set("name")} required />
      </div>
      {business && (
        <div>
          <label className="field-label" htmlFor={`${kind}-company`}>Empresa ou instituição</label>
          <input id={`${kind}-company`} className="field" autoComplete="organization" value={form.company} onChange={set("company")} required />
        </div>
      )}
      <div>
        <label className="field-label" htmlFor={`${kind}-phone`}>Telemóvel</label>
        <input id={`${kind}-phone`} className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="9XX XXX XXX" value={form.phone} onChange={set("phone")} required />
      </div>
      <div>
        <label className="field-label" htmlFor={`${kind}-email`}>Email{!business && <span className="text-mute"> (opcional)</span>}</label>
        <input id={`${kind}-email`} className="field" type="email" autoComplete="email" value={form.email} onChange={set("email")} required={business} />
      </div>
      {business && products.length > 0 && (
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor={`${kind}-product`}>Pacote de interesse</label>
          <select id={`${kind}-product`} className="field" value={form.product_id} onChange={set("product_id")}>
            <option value="">Ainda não sei / proposta à medida</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      {business && (
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor={`${kind}-message`}>O que pretende <span className="text-mute">(opcional)</span></label>
          <textarea id={`${kind}-message`} className="field min-h-28" value={form.message} onChange={set("message")} maxLength={1500} />
        </div>
      )}
      {error && <p className="text-sm text-ember sm:col-span-2" role="alert">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-gold w-full sm:w-auto" disabled={busy}>
          {busy ? "A enviar…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
