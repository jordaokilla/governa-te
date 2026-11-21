// Tarefa periódica (pg_cron, de 5 em 5 minutos): confirma na AppyPay os pagamentos
// pendentes, fecha as tentativas sem resposta e liberta as reservas fora de prazo.
// deno-lint-ignore-file no-explicit-any
import { cors, fail, getConfig, json, serviceClient, timingSafeEqual } from "../../_shared/db.ts";
import { getToken, isConfigured, lookupCharge } from "../../_shared/appypay.ts";
import { applyOutcome } from "../../_shared/payments.ts";

const EXPRESS_GIVE_UP_MS = 20 * 60_000;
const REFERENCE_GRACE_MS = 6 * 3_600_000;

export async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const db = serviceClient();
    const cfg = await getConfig(db);
    const provided = req.headers.get("x-cron-secret") ?? "";
    if (!cfg.cron_secret || !timingSafeEqual(provided, cfg.cron_secret)) return fail("Não autorizado", 401);

    const summary = { checked: 0, paid: 0, failed: 0, expired_orders: 0 };

    if (isConfigured(cfg)) {
      const { data: pending } = await db
        .from("payments")
        .select("merchant_transaction_id, method, created_at, due_at")
        .eq("status", "pending")
        .order("updated_at", { ascending: true })
        .limit(40);

      if (pending?.length) {
        const token = await getToken(cfg);
        for (const p of pending as any[]) {
          summary.checked++;
          const found = await lookupCharge(cfg, token, p.merchant_transaction_id);
          if (found && found.outcome !== "pending") {
            await applyOutcome(db, cfg, p.merchant_transaction_id, found.outcome, {
              transactionId: found.transactionId,
            });
            summary[found.outcome]++;
            continue;
          }
          const age = Date.now() - new Date(p.created_at).getTime();
          const referenceOver = p.method === "referencia" && p.due_at &&
            Date.now() - new Date(p.due_at).getTime() > REFERENCE_GRACE_MS;
          if ((p.method === "express" && age > EXPRESS_GIVE_UP_MS) || referenceOver) {
            await applyOutcome(db, cfg, p.merchant_transaction_id, "failed", {
              message: p.method === "express" ? "não foi confirmado no telemóvel a tempo" : "a referência expirou",
            });
            summary.failed++;
          } else {
            // Volta para o fim da fila.
            await db.from("payments").update({ updated_at: new Date().toISOString() }).eq("merchant_transaction_id", p.merchant_transaction_id);
          }
        }
      }
    }

    // Reservas fora de prazo deixam de ocupar lugares.
    const { data: expired } = await db
      .from("orders")
      .update({ status: "expired" })
      .in("status", ["awaiting_payment", "processing"])
      .lt("expires_at", new Date(Date.now() - 10 * 60_000).toISOString())
      .select("id");
    summary.expired_orders = expired?.length ?? 0;

    await db.from("rate_limits").delete().lt("window_start", new Date(Date.now() - 86_400_000).toISOString());

    return json(summary);
  } catch (err) {
    console.error("[reconcile]", err);
    return fail("Erro interno", 500);
  }
}
