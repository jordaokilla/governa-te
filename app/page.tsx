import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { getSite } from "@/lib/site";
import { Pillars, Shell } from "@/components/site/Shell";
import { TeamGrid } from "@/components/site/TeamGrid";
import { ProductCard } from "@/components/site/ProductCard";
import { LeadForm } from "@/components/site/LeadForm";
import { eventWhen, eventWhere } from "@/components/site/EventFacts";

const PATHS = [
  { n: "01", title: "Carreira e direcção", text: "Clareza profissional e competências para evoluir." },
  { n: "02", title: "Problemas e oportunidades", text: "Necessidades reais que podem dar origem a soluções." },
  { n: "03", title: "Aquisição de clientes", text: "Comunicação, canais digitais e atendimento." },
  { n: "04", title: "Vendas", text: "Compreensão do cliente e proposta comercial." },
  { n: "05", title: "Organização do negócio", text: "Processos, responsabilidades e crescimento." },
];

export default async function Home() {
  const { settings, products, team } = await getSite();
  const tickets = products.filter((p) => p.kind === "ticket");
  const hiddenCount = team.filter((m) => !m.is_revealed).length;
  const stats = [
    { value: "8", label: "Horas" },
    { value: String(settings.capacity ?? 660), label: "Participantes" },
    { value: "7", label: "Membros" },
  ];

  return (
    <Shell settings={settings}>
      {/* Abertura */}
      <section className="relative isolate overflow-hidden">
        <Image src="/img/auditorio.jpg" alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-25" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/70 via-ink/80 to-ink" />
        <div aria-hidden className="glow-gold pointer-events-none absolute -top-32 left-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2" />
        <div className="container-x pt-14 pb-16 sm:pt-20 sm:pb-24">
          <Image src="/img/logo.png" alt="GOVERNA-TE · A geração por quem se espera" width={900} height={653} priority className="h-auto w-56 sm:w-72" />
          <h1 className="mt-10 max-w-3xl font-display text-4xl leading-[1.08] font-medium tracking-tight text-white uppercase sm:text-5xl lg:text-6xl">
            Responsabilidade que se transforma em acção.
          </h1>
          <p className="lead mt-6 max-w-xl">
            Movimento de desenvolvimento pessoal e iniciativa empreendedora em Angola.
          </p>
          <div className="mt-7 flex flex-col gap-2.5 text-[15px] text-paper/90 sm:flex-row sm:gap-7">
            <span className="inline-flex items-center gap-2"><CalendarDays size={18} className="text-gold" aria-hidden />{eventWhen(settings)}</span>
            <span className="inline-flex items-center gap-2"><MapPin size={18} className="text-gold" aria-hidden />{eventWhere(settings)}</span>
          </div>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/bilhetes" className="btn btn-gold">Garantir o meu lugar</Link>
            <Link href="/patrocinadores" className="btn btn-ghost">Ser parceiro do encontro</Link>
          </div>
        </div>
      </section>

      {/* O movimento */}
      <section id="movimento" className="scroll-mt-20 border-t border-white/5 py-16 sm:py-24">
        <div className="container-x">
          <p className="eyebrow">O movimento</p>
          <h2 className="h-display mt-4">Governa a tua vida.<br />Constrói o teu caminho.</h2>
          <p className="lead mt-6 max-w-3xl">
            O GOVERNA-TE reúne pessoas que querem assumir as suas decisões, desenvolver capacidades e transformar problemas em
            oportunidades de trabalho e negócio.
          </p>
          <div className="mt-10">
            <Pillars
              items={[
                { title: "Autorresponsabilidade", text: "Reconhecer o que depende de si e escolher um próximo passo que possa executar." },
                { title: "Capacidade para agir", text: "Aprender com experiências reais de carreira, vendas, marketing e organização empresarial." },
                { title: "Construção colectiva", text: "Aproximar cidadãos, empresas e instituições para ampliar acesso ao conhecimento e às oportunidades." },
              ]}
            />
          </div>
        </div>
      </section>

      {/* O encontro */}
      <section id="encontro" className="scroll-mt-20 border-t border-white/5 bg-coal py-16 sm:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow">Primeiro encontro</p>
            <h2 className="h-display mt-4">Um dia que abre um novo percurso.</h2>
            <dl className="mt-9 grid grid-cols-3 gap-4 border-y border-white/10 py-7">
              {stats.map((s) => (
                <div key={s.label}>
                  <dd className="font-display text-4xl font-medium text-gold sm:text-5xl">{s.value}</dd>
                  <dt className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/80">{s.label}</dt>
                </div>
              ))}
            </dl>
            <div className="mt-8 space-y-6">
              <div>
                <h3 className="font-display text-lg text-gold">{eventWhere(settings)}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-paper/80">
                  {settings.venue_confirmed
                    ? "Local confirmado pela organização."
                    : "Local previsto pela organização, sujeito à confirmação do recinto e das condições de realização."}
                </p>
              </div>
              <div>
                <h3 className="font-display text-lg text-gold">{settings.edition}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-paper/80">
                  {settings.event_date
                    ? eventWhen(settings)
                    : "Data e horário serão comunicados após a definição do calendário de produção."}
                </p>
              </div>
              <div>
                <h3 className="font-display text-lg text-gold">Aprendizagem com participação</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-paper/80">
                  Intervenções dos cinco oradores, convidados, moderação e momentos de aplicação ao longo das oito horas.
                </p>
              </div>
            </div>
          </div>
          <figure>
            <div className="relative aspect-[3/2] overflow-hidden rounded-2xl border border-line">
              <Image src="/img/auditorio.jpg" alt="Auditório em patamares cheio de participantes, com o palco do GOVERNA-TE ao fundo" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
            <figcaption className="mt-3 text-xs text-mute">
              Palco elevado, auditório em patamares, proximidade entre conteúdo e público. Visualização conceptual, não é uma fotografia do recinto.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Para quem */}
      <section className="border-t border-white/5 py-16 sm:py-24">
        <div className="container-x">
          <p className="eyebrow">Público e resultado</p>
          <h2 className="h-display mt-4">Para quem quer dar o próximo passo.</h2>
          <div className="mt-10">
            <Pillars
              columns={4}
              items={[
                { title: "Quem quer começar", text: "Transformar uma competência, uma ideia ou um problema observado numa possibilidade de actividade económica." },
                { title: "Quem já empreende", text: "Melhorar a oferta, conquistar clientes e organizar o crescimento do negócio." },
                { title: "Quem constrói carreira", text: "Ganhar direcção profissional, preparar-se para o mercado e reconhecer competências a desenvolver." },
                { title: "Quem cria oportunidades", text: "Empresas e instituições que investem em capacitação, talento e iniciativa empreendedora." },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Oradores */}
      <section id="oradores" className="relative scroll-mt-20 overflow-hidden border-t border-white/5 bg-black py-16 sm:py-24">
        <div className="container-x">
          <div className="text-center">
            <p className="eyebrow">Sete membros. Um compromisso comum.</p>
            <h2 className="mt-4 font-display text-3xl leading-tight font-semibold tracking-wide text-gold-soft uppercase sm:text-4xl">
              {hiddenCount > 0 ? "Quem é o governante que irá surgir?" : "Os governantes do primeiro encontro"}
            </h2>
            {hiddenCount > 0 && (
              <p className="mt-4 font-display text-sm font-semibold tracking-[0.2em] text-gold-soft uppercase">
                A revelação aproxima-se.
              </p>
            )}
            <div className="rule-ember mx-auto mt-5" />
          </div>
          <div className="mt-12">
            <TeamGrid team={team} />
          </div>
        </div>
      </section>

      {/* Cinco caminhos */}
      <section className="border-t border-white/5 py-16 sm:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="eyebrow">Conteúdos</p>
            <h2 className="h-display mt-4">Cinco caminhos para começar a agir.</h2>
            <p className="mt-5 text-[15px] leading-relaxed text-paper/75">
              Queremos que cada participante saia com uma decisão mais clara e uma acção concreta para começar.
            </p>
          </div>
          <ol className="divide-y divide-white/10 border-y border-white/10">
            {PATHS.map((p) => (
              <li key={p.n} className="flex gap-6 py-5">
                <span className="w-10 shrink-0 font-display text-3xl font-light text-gold">{p.n}</span>
                <div>
                  <h3 className="font-display text-xl text-white">{p.title}</h3>
                  <p className="mt-1 text-[15px] text-paper/75">{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Experiência */}
      <section className="border-t border-white/5 bg-coal py-16 sm:py-24">
        <div className="container-x">
          <p className="eyebrow">Experiência</p>
          <h2 className="h-display mt-4">Participar. Compreender. Começar.</h2>
          <p className="lead mt-6 max-w-3xl">O conteúdo precisa de se transformar numa decisão que a pessoa consiga levar para a sua vida.</p>
          <div className="mt-10">
            <Pillars
              items={[
                { title: "Durante o encontro", text: "Alternância entre intervenções, reflexão, perguntas e participação do público, com condução contínua da moderação." },
                { title: "Na ligação com os outros", text: "Oportunidades de contacto com pessoas que partilham desafios de carreira e de negócio." },
                { title: "Na saída", text: "Registo de uma prioridade pessoal e escolha de um primeiro passo concreto para executar." },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Bilhetes */}
      <section id="bilhetes" className="scroll-mt-20 border-t border-white/5 py-16 sm:py-24">
        <div className="container-x">
          <p className="eyebrow">Bilhetes</p>
          <h2 className="h-display mt-4">Garanta o seu lugar na sala.</h2>
          {tickets.length > 0 ? (
            <>
              <p className="lead mt-5 max-w-2xl">
                {settings.sales_open
                  ? "Compra online com Multicaixa Express ou por referência. O bilhete chega com código QR."
                  : "As vendas abrem em breve. Veja os bilhetes previstos."}
              </p>
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {tickets.map((p) => <ProductCard key={p.id} product={p} salesOpen={settings.sales_open} requestHref="/bilhetes" />)}
              </div>
            </>
          ) : (
            <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
              <p className="lead">
                A venda de bilhetes abre em breve. Deixe o seu contacto e avisamos assim que os lugares estiverem disponíveis.
              </p>
              <Suspense>
                <LeadForm kind="waitlist" submitLabel="Avisem-me quando abrir" doneText="Avisamos assim que a venda de bilhetes abrir." />
              </Suspense>
            </div>
          )}
        </div>
      </section>

      {/* Parceiros */}
      <section className="border-t border-white/5 bg-coal py-16 sm:py-24">
        <div className="container-x">
          <p className="eyebrow">Empresas e instituições</p>
          <h2 className="h-display mt-4">Onde a sua instituição pode fazer parte.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="card flex flex-col p-7">
              <h3 className="font-display text-2xl text-white">Expositores</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-paper/80">
                Activação ou exposição junto do público, ajustada à experiência e às condições do recinto.
              </p>
              <Link href="/expositores" className="btn btn-ghost mt-7 self-start">Ver espaços de expositor</Link>
            </div>
            <div className="card flex flex-col p-7">
              <h3 className="font-display text-2xl text-white">Patrocinadores</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-paper/80">
                Patrocínio financeiro, bens e serviços, cooperação institucional ou conhecimento e acesso, com entregas claras.
              </p>
              <Link href="/patrocinadores" className="btn btn-ghost mt-7 self-start">Ver formas de patrocínio</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Continuidade */}
      <section className="border-t border-white/5 py-16 sm:py-24">
        <div className="container-x">
          <p className="eyebrow">Continuidade</p>
          <h2 className="h-display mt-4">O movimento continua depois do encontro.</h2>
          <p className="lead mt-6 max-w-3xl">
            O primeiro dia apresenta o GOVERNA-TE. A continuidade deve dar utilidade à relação que começa na sala.
          </p>
          <div className="mt-10">
            <Pillars
              items={[
                { title: "Antes", text: "Conteúdos de preparação, apresentação progressiva da organização e informação prática para participar." },
                { title: "Durante", text: "Aprendizagem, participação, novas ligações e escolha de uma acção para executar." },
                { title: "Depois", text: "Proposta de conteúdos de acompanhamento, recolha de resultados e novos encontros, com calendário a definir." },
              ]}
            />
          </div>
        </div>
      </section>
    </Shell>
  );
}
