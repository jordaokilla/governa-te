import type { Metadata } from "next";
import { Suspense } from "react";
import { getSite } from "@/lib/site";
import { PageHero, Pillars, Shell } from "@/components/site/Shell";
import { ProductCard } from "@/components/site/ProductCard";
import { LeadForm } from "@/components/site/LeadForm";

export const metadata: Metadata = {
  title: "Patrocinadores",
  description: "Patrocínio e parcerias institucionais do primeiro encontro GOVERNA-TE, em Luanda.",
};

const STEPS = [
  { title: "Reunião institucional", text: "Apresentação dos objectivos, do público e das necessidades de produção." },
  { title: "Proposta específica", text: "Definição do âmbito da colaboração, das entregas e das condições de execução." },
  { title: "Formalização", text: "Acordo e calendário antes da divulgação pública da parceria." },
];

export default async function Patrocinadores() {
  const { settings, products } = await getSite();
  const items = products.filter((p) => p.kind === "sponsor");

  return (
    <Shell settings={settings}>
      <PageHero eyebrow="Patrocinadores" title="Onde a sua instituição pode fazer parte.">
        <p>Convidamos empresas e instituições a conhecer o projecto e a identificar uma contribuição concreta para a sua realização.</p>
      </PageHero>

      <section className="py-14 sm:py-20">
        <div className="container-x">
          <Pillars
            columns={4}
            items={[
              { title: "Patrocínio financeiro", text: "Contribuir para produção, estrutura técnica, comunicação e execução do encontro." },
              { title: "Bens e serviços", text: "Apoiar necessidades concretas, como equipamentos, impressão, logística, materiais e acolhimento." },
              { title: "Cooperação institucional", text: "Articular iniciativas de capacitação e ampliar o contacto com oportunidades profissionais e empresariais." },
              { title: "Conhecimento e acesso", text: "Disponibilizar especialistas, recursos e oportunidades previamente acordadas." },
            ]}
          />

          {items.length > 0 && (
            <>
              <h2 className="mt-16 font-display text-2xl text-white sm:text-3xl">Categorias de patrocínio</h2>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => <ProductCard key={p.id} product={p} salesOpen={settings.sales_open} requestHref="/patrocinadores" />)}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="border-t border-white/5 bg-coal py-14 sm:py-20">
        <div className="container-x">
          <p className="eyebrow">Relação com parceiros</p>
          <h2 className="h-display mt-4">Uma parceria precisa de entregas claras.</h2>
          <div className="mt-10">
            <Pillars
              columns={4}
              items={[
                { title: "Presença da marca", text: "Integração possível na comunicação, nos materiais e nos espaços do evento, conforme a categoria contratada." },
                { title: "Contacto com o público", text: "Activação ou exposição ajustada à experiência e às condições do recinto." },
                { title: "Prestação de contas", text: "Relatório com registos da execução, entregas acordadas e indicadores efectivamente apurados." },
                { title: "Acordo individual", text: "Valores, quantidades, exclusividades e contrapartidas definidos na proposta e no contrato da parceria." },
              ]}
            />
          </div>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-line p-6">
                <span className="font-display text-sm font-semibold tracking-[0.18em] text-gold">0{i + 1}</span>
                <h3 className="mt-2 font-display text-lg text-white">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-paper/75">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="proposta" className="scroll-mt-20 border-t border-white/5 py-14 sm:py-20">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="eyebrow">Próximos passos</p>
            <h2 className="h-display mt-4">Vamos construir esta parceria.</h2>
            <p className="mt-5 text-[15px] leading-relaxed text-paper/80">
              Deixe os dados da sua instituição. A organização marca a reunião institucional e prepara uma proposta específica.
            </p>
          </div>
          <Suspense>
            <LeadForm
              kind="sponsor"
              submitLabel="Pedir reunião e proposta"
              doneText="A organização entra em contacto para marcar a reunião institucional."
              products={items.map((p) => ({ id: p.id, name: p.name }))}
            />
          </Suspense>
        </div>
      </section>
    </Shell>
  );
}
