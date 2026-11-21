import Link from "next/link";
import { Check } from "lucide-react";
import { kz } from "@/lib/format";
import type { Product } from "@/lib/types";

/** Cartão de um pacote. O botão compra (preço fixo) ou leva ao pedido de proposta. */
export function ProductCard({ product, salesOpen, requestHref }: { product: Product; salesOpen: boolean; requestHref: string }) {
  const soldOut = product.remaining !== null && product.remaining <= 0;
  const buyable = !product.on_request && product.price !== null;
  const few = product.remaining !== null && product.remaining > 0 && product.remaining <= 20;

  return (
    <article className={`card relative flex flex-col p-6 sm:p-7 ${product.is_featured ? "border-gold/60 shadow-[0_0_0_1px_rgba(217,177,90,0.25),0_30px_60px_-40px_rgba(217,177,90,0.55)]" : ""}`}>
      {product.is_featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-ink">
          Em destaque
        </span>
      )}
      <h3 className="font-display text-xl font-medium text-white">{product.name}</h3>
      {product.tagline && <p className="mt-1 text-sm text-gold">{product.tagline}</p>}
      <p className="mt-5 font-display text-3xl font-semibold tracking-tight text-white">
        {buyable ? kz(product.price) : "Sob proposta"}
      </p>
      {product.description && <p className="mt-4 text-[15px] leading-relaxed text-paper/75">{product.description}</p>}
      {product.benefits.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {product.benefits.map((b) => (
            <li key={b} className="flex gap-2.5 text-sm text-paper/85">
              <Check size={17} className="mt-0.5 shrink-0 text-gold" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-7">
        {few && !soldOut && (
          <p className="mb-3 text-xs font-medium text-ember">
            {product.remaining === 1 ? "Resta 1 unidade" : `Restam ${product.remaining} unidades`}
          </p>
        )}
        {soldOut ? (
          <span className="btn btn-ghost w-full cursor-not-allowed opacity-60">Esgotado</span>
        ) : buyable && salesOpen ? (
          <Link href={`/comprar?p=${product.id}`} className="btn btn-gold w-full">
            {product.kind === "ticket" ? "Comprar bilhete" : "Reservar agora"}
          </Link>
        ) : buyable ? (
          <span className="btn btn-ghost w-full cursor-not-allowed opacity-70">Vendas brevemente</span>
        ) : (
          <Link href={`${requestHref}?pacote=${product.id}#proposta`} className="btn btn-ghost w-full">
            Pedir proposta
          </Link>
        )}
      </div>
    </article>
  );
}
