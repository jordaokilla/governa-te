"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, fetchSite } from "@/lib/api";
import type { Settings, Ticket } from "@/lib/types";
import { eventWhen, eventWhere } from "@/components/site/EventFacts";
import { TicketCard } from "./TicketCard";

type PublicTicket = Pick<Ticket, "code" | "holder_name" | "product_name" | "status">;

export function TicketView() {
  const token = useSearchParams().get("t") ?? "";
  const valid = /^[a-f0-9]{32}$/.test(token);
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!valid) return;
    let alive = true;
    api.ticket(token).then((r) => alive && setTicket(r.ticket)).catch((e) => alive && setError(e instanceof Error ? e.message : "Erro"));
    fetchSite().then((s) => alive && setSettings(s.settings)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [token, valid]);

  if (!valid || error) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <h1 className="font-display text-2xl text-white">Bilhete não encontrado</h1>
        <p className="mt-3 text-[15px] text-paper/80">{error ?? "A ligação deste bilhete não é válida."}</p>
        <Link href="/meus-bilhetes" className="btn btn-gold mt-7">Procurar os meus bilhetes</Link>
      </div>
    );
  }
  if (!ticket) return <div className="card mx-auto h-72 max-w-2xl animate-pulse" role="status" aria-label="A carregar o bilhete" />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-medium text-white">O seu bilhete</h1>
      <TicketCard
        code={ticket.code}
        holder={ticket.holder_name}
        product={ticket.product_name}
        status={ticket.status}
        when={settings ? eventWhen(settings) : undefined}
        where={settings ? eventWhere(settings) : undefined}
      />
      <p className="text-sm text-paper/70">Apresente este código QR à entrada. Cada bilhete só pode ser validado uma vez.</p>
    </div>
  );
}
