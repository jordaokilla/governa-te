import type { Metadata } from "next";
import { Suspense } from "react";
import { Shell } from "@/components/site/Shell";
import { OrderView } from "@/components/checkout/OrderView";

export const metadata: Metadata = { title: "O seu pedido", robots: { index: false } };

export default function Pedido() {
  return (
    <Shell>
      <section className="py-10 sm:py-14">
        <div className="container-x">
          <Suspense fallback={<div className="card mx-auto h-80 max-w-2xl animate-pulse" />}>
            <OrderView />
          </Suspense>
        </div>
      </section>
    </Shell>
  );
}
