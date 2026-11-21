import type { Metadata } from "next";
import { Suspense } from "react";
import { Shell } from "@/components/site/Shell";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = { title: "Comprar", robots: { index: false } };

export default function Comprar() {
  return (
    <Shell>
      <section className="py-10 sm:py-14">
        <div className="container-x">
          <Suspense fallback={<div className="card mx-auto h-96 max-w-4xl animate-pulse" />}>
            <CheckoutForm />
          </Suspense>
        </div>
      </section>
    </Shell>
  );
}
