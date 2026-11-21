import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getSite } from "@/lib/site";
import { PageHero, Shell } from "@/components/site/Shell";
import { ProductCard } from "@/components/site/ProductCard";
import { LeadForm } from "@/components/site/LeadForm";
import { eventWhen, eventWhere } from "@/components/site/EventFacts";

export const metadata: Metadata = {
  title: "Bilhetes",
  description: "Bilhetes para o primeiro encontro GOVERNA-TE, em Luanda. Pagamento por Multicaixa Express ou por referência.",
};

const STEPS = [
  { title: "Escolha o bilhete", text: "Indique a quantidade e os seus dados." },
  { title: "Pague como preferir", text: "Multicaixa Express, no telemóvel, ou por referência, no Multicaixa ou no banco." },
  { title: "Receba o bilhete", text: "Fica com um código QR por pessoa, para apresentar à entrada." },
];

export default async function Bilhetes() {
  const { settings, products } = await getSite();
  const tickets = products.filter((p) => p.kind === "ticket");

  return (
    <Shell settings={settings}>
      <PageHero eyebrow="Bilhetes" title="Garanta o seu lugar na sala.">
        <p>{eventWhen(settings)} · {eventWhere(settings)}</p>
      </PageHero>

      <section className="py-14 sm:py-20">
        <div className="container-x">
          {tickets.length > 0 ? (
            <>
              {!settings.sales_open && (
                <p className="card mb-8 border-gold/40 p-5 text-[15px] text-paper/90">
                  As vendas ainda não abriram. Pode ver os bilhetes previstos e deixar o seu contacto mais abaixo para ser avisado.
                </p>
              )}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {tickets.map((p) => <ProductCard key={p.id} product={p} salesOpen={settings.sales_open} requestHref="/bilhetes" />)}
              </div>
            </>
          ) : (
            <div className="card border-gold/40 p-7">
              <h2 className="font-display text-2xl text-white">A venda de bilhetes abre em breve</h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-paper/80">
                A organização está a fechar o calendário e as condições do encontro. Deixe o seu contacto e avisamos assim que os
                lugares estiverem disponíveis.
              </p>
            </div>
          )}

          {(tickets.length === 0 || !settings.sales_open) && (
            <div className="mt-10 max-w-2xl">
              <h2 className="font-display text-xl text-white">Quero ser avisado</h2>
              <div className="mt-4">
                <Suspense>
                  <LeadForm kind="waitlist" submitLabel="Avisem-me quando abrir" doneText="Avisamos assim que a venda de bilhetes abrir." />
                </Suspense>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-white/5 bg-coal py-14 sm:py-20">
        <div className="container-x">
          <p className="eyebrow">Como funciona</p>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card p-6">
                <span className="font-display text-3xl font-light text-gold">0{i + 1}</span>
                <h3 className="mt-3 font-display text-lg text-white">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-paper/75">{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm text-mute">
            Já comprou? Veja <Link href="/meus-bilhetes" className="text-gold underline underline-offset-4">os seus bilhetes</Link>.
          </p>
        </div>
      </section>
    </Shell>
  );
}
