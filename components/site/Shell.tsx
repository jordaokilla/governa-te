import { Header } from "./Header";
import { Footer } from "./Footer";
import type { Settings } from "@/lib/types";

export function Shell({ settings, children }: { settings?: Settings; children: React.ReactNode }) {
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-ink">
        Saltar para o conteúdo
      </a>
      <Header />
      <main id="conteudo" className="flex-1">{children}</main>
      <Footer settings={settings} />
    </>
  );
}

export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-white/5">
      <div aria-hidden className="glow-gold pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2" />
      <div className="container-x relative py-14 sm:py-20">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="h-display mt-4 max-w-3xl">{title}</h1>
        {children && <div className="lead mt-5 max-w-2xl">{children}</div>}
      </div>
    </section>
  );
}

export function Pillars({ items, columns = 3 }: { items: { title: string; text: string }[]; columns?: 2 | 3 | 4 }) {
  const grid = columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid gap-4 ${grid}`}>
      {items.map((item) => (
        <div key={item.title} className="card p-6">
          <h3 className="font-display text-lg font-medium text-gold">{item.title}</h3>
          <p className="mt-2.5 text-[15px] leading-relaxed text-paper/80">{item.text}</p>
        </div>
      ))}
    </div>
  );
}
