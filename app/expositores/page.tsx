import type { Metadata } from "next";
import { Suspense } from "react";
import { getSite } from "@/lib/site";
import { PageHero, Pillars, Shell } from "@/components/site/Shell";
import { ProductCard } from "@/components/site/ProductCard";
import { LeadForm } from "@/components/site/LeadForm";

export const metadata: Metadata = {
  title: "Expositores",
  description: "Espaços de exposição e activação no primeiro encontro GOVERNA-TE, em Luanda.",
};

export default async function Expositores() {
  const { settings, products } = await getSite();
  const items = products.filter((p) => p.kind === "exhibitor");

  return (
    <Shell settings={settings}>
      <PageHero eyebrow="Expositores" title="Mostre a sua marca a quem quer dar o próximo passo.">
        <p>
          Um dia com {settings.capacity ?? 660} participantes interessados em carreira, vendas, marketing e organização empresarial.
        </p>
      </PageHero>

      <section className="py-14 sm:py-20">
        <div className="container-x">
          <Pillars
            items={[
              { title: "Contacto com o público", text: "Activação ou exposição ajustada à experiência e às condições do recinto." },
              { title: "Presença da marca", text: "Integração possível na comunicação, nos materiais e nos espaços do evento, conforme a categoria contratada." },
              { title: "Prestação de contas", text: "Relatório com registos da execução, entregas acordadas e indicadores efectivamente apurados." },
            ]}
          />

          {items.length > 0 && (
            <>
              <h2 className="mt-16 font-display text-2xl text-white sm:text-3xl">Espaços disponíveis</h2>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => <ProductCard key={p.id} product={p} salesOpen={settings.sales_open} requestHref="/expositores" />)}
              </div>
            </>
          )}
        </div>
      </section>

      <section id="proposta" className="scroll-mt-20 border-t border-white/5 bg-coal py-14 sm:py-20">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="eyebrow">Pedido de proposta</p>
            <h2 className="h-display mt-4">Fale com a organização.</h2>
            <p className="mt-5 text-[15px] leading-relaxed text-paper/80">
              Diga-nos o que pretende expor ou activar. A organização responde com as condições do espaço, as contrapartidas e os
              passos para a reserva.
            </p>
          </div>
          <Suspense>
            <LeadForm
              kind="exhibitor"
              submitLabel="Pedir proposta de expositor"
              doneText="A organização entra em contacto consigo com as condições do espaço."
              products={items.map((p) => ({ id: p.id, name: p.name }))}
            />
          </Suspense>
        </div>
      </section>
    </Shell>
  );
}
