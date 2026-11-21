import type { Metadata } from "next";
import { Suspense } from "react";
import { Activate } from "@/components/admin/Activate";

export const metadata: Metadata = { title: "Activar acesso", robots: { index: false, follow: false } };

export default function Activar() {
  return (
    <Suspense>
      <Activate />
    </Suspense>
  );
}
