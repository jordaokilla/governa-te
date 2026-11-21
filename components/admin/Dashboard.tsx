"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { KIND_PLURAL, kz } from "@/lib/format";
import type { Kind } from "@/lib/types";
import { ErrorBox, errorText, Loading, PageTitle, Stat } from "./ui";

interface Stats {
  revenue: number;
  revenue_by_kind: Partial<Record<Kind, number>>;
  orders_paid: number;
  orders_open: number;
  pending_amount: number;
  tickets_issued: number;
  tickets_used: number;
  leads_new: number;
  capacity: number | null;
  products: { id: string; kind: Kind; name: string; stock: number | null; is_published: boolean; sold: number; revenue: number; reserved: number }[];
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase().rpc("admin_stats");
    if (err) setError(errorText(err));
    else {
      setStats(data as Stats);
      setError(null);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(load, 30000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load]);

  if (error && !stats) return <ErrorBox text={error} onRetry={load} />;
  if (!stats) return <Loading />;

  return (
    <>
      <PageTitle title="Resumo" text="Vendas confirmadas, pedidos em curso e entradas. Actualiza de 30 em 30 segundos." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Receita confirmada" value={kz(Number(stats.revenue))} hint={`${stats.orders_paid} ${stats.orders_paid === 1 ? "pedido pago" : "pedidos pagos"}`} />
        <Stat label="A aguardar pagamento" value={kz(Number(stats.pending_amount))} hint={`${stats.orders_open} ${stats.orders_open === 1 ? "pedido em curso" : "pedidos em curso"}`} />
        <Stat label="Bilhetes emitidos" value={`${stats.tickets_issued}${stats.capacity ? ` / ${stats.capacity}` : ""}`} hint={stats.capacity ? "em relação à lotação" : undefined} />
        <Stat label="Entradas validadas" value={String(stats.tickets_used)} hint={`${stats.leads_new} ${stats.leads_new === 1 ? "contacto novo" : "contactos novos"}`} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {(["ticket", "exhibitor", "sponsor"] as Kind[]).map((k) => (
          <Stat key={k} label={KIND_PLURAL[k]} value={kz(Number(stats.revenue_by_kind?.[k] ?? 0))} />
        ))}
      </div>

      <h2 className="mt-9 mb-3 font-display text-lg text-white">Por pacote</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-mute">
            <tr>
              <th className="px-4 py-3 font-medium">Pacote</th>
              <th className="px-4 py-3 font-medium">Vendidos</th>
              <th className="px-4 py-3 font-medium">Reservados</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 text-right font-medium">Receita</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {stats.products.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <span className="text-white">{p.name}</span>
                  <span className="ml-2 text-xs text-mute">{KIND_PLURAL[p.kind]}{!p.is_published && " · por publicar"}</span>
                </td>
                <td className="px-4 py-3 text-paper/85">{p.sold}</td>
                <td className="px-4 py-3 text-paper/85">{Math.max(p.reserved - p.sold, 0)}</td>
                <td className="px-4 py-3 text-paper/85">{p.stock ?? "Sem limite"}</td>
                <td className="px-4 py-3 text-right text-white">{kz(Number(p.revenue))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
