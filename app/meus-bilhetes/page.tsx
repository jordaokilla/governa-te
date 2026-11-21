import type { Metadata } from "next";
import { PageHero, Shell } from "@/components/site/Shell";
import { MyTickets } from "@/components/checkout/MyTickets";

export const metadata: Metadata = { title: "Os meus bilhetes", robots: { index: false } };

export default function MeusBilhetes() {
  return (
    <Shell>
      <PageHero eyebrow="Os meus bilhetes" title="Encontre os seus bilhetes e pedidos.">
        <p>Indique o email e o telemóvel que usou na compra.</p>
      </PageHero>
      <section className="py-10 sm:py-14">
        <div className="container-x"><MyTickets /></div>
      </section>
    </Shell>
  );
}
