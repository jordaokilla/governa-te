"use client";
import { Landmark, Smartphone } from "lucide-react";
import type { PayMethod } from "@/lib/types";

interface Props {
  method: PayMethod;
  onMethod: (m: PayMethod) => void;
  payPhone: string;
  onPayPhone: (v: string) => void;
  idPrefix?: string;
}

const OPTIONS: { id: PayMethod; title: string; text: string; icon: typeof Smartphone }[] = [
  { id: "express", title: "Multicaixa Express", text: "Recebe o pedido de pagamento no telemóvel e confirma com o PIN.", icon: Smartphone },
  { id: "referencia", title: "Pagamento por referência", text: "Recebe a entidade e a referência para pagar no Multicaixa ou no banco.", icon: Landmark },
];

/** Escolha entre Multicaixa Express e referência. */
export function PaymentMethod({ method, onMethod, payPhone, onPayPhone, idPrefix = "pay" }: Props) {
  return (
    <fieldset>
      <legend className="field-label">Forma de pagamento</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((o) => {
          const active = method === o.id;
          return (
            <label
              key={o.id}
              className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${active ? "border-gold bg-gold/[0.07]" : "border-line bg-coal hover:border-white/25"}`}
            >
              <input type="radio" name={`${idPrefix}-method`} className="sr-only" checked={active} onChange={() => onMethod(o.id)} />
              <o.icon size={22} className={active ? "mt-0.5 shrink-0 text-gold" : "mt-0.5 shrink-0 text-mute"} aria-hidden />
              <span>
                <span className="block font-display text-[15px] font-semibold text-white">{o.title}</span>
                <span className="mt-1 block text-sm leading-snug text-paper/70">{o.text}</span>
              </span>
            </label>
          );
        })}
      </div>
      {method === "express" && (
        <div className="mt-4">
          <label className="field-label" htmlFor={`${idPrefix}-phone`}>Número do Multicaixa Express</label>
          <input
            id={`${idPrefix}-phone`}
            className="field"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="9XX XXX XXX"
            value={payPhone}
            onChange={(e) => onPayPhone(e.target.value)}
          />
          <p className="field-hint">O telemóvel associado à aplicação Multicaixa Express que vai pagar.</p>
        </div>
      )}
    </fieldset>
  );
}
