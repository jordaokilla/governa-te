import type { Metadata } from "next";
import { Suspense } from "react";
import { Shell } from "@/components/site/Shell";
import { TicketView } from "@/components/checkout/TicketView";

export const metadata: Metadata = { title: "Bilhete", robots: { index: false } };

export default function Bilhete() {
  return (
    <Shell>
      <section className="py-10 sm:py-14">
        <div className="container-x">
          <Suspense fallback={<div className="card mx-auto h-72 max-w-2xl animate-pulse" />}>
            <TicketView />
          </Suspense>
        </div>
      </section>
    </Shell>
  );
}
