// Webhook da AppyPay. O corpo só serve para localizar a transacção:
// o estado real é sempre confirmado directamente na AppyPay antes de marcar o pedido.
import { cors, fail, getConfig, json, serviceClient, timingSafeEqual } from "../lib/db.ts";
import { getToken, lookupCharge } from "../lib/appypay.ts";
import { applyOutcome } from "../lib/payments.ts";

export async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const db = serviceClient();
    const cfg = await getConfig(db);
    const provided = new URL(req.url).searchParams.get("secret") ?? "";
    if (!cfg.appypay_webhook_secret || !timingSafeEqual(provided, cfg.appypay_webhook_secret)) {
      console.warn("[appypay-webhook] rejeitado; segredo presente:", provided.length > 0);
      return fail("Não autorizado", 401);
    }

    const body = await req.json().catch(() => ({}));
    const merchantTxId = String(body?.merchantTransactionId ?? body?.merchant_transaction_id ?? "");
    if (!/^[A-Za-z0-9]{6,40}$/.test(merchantTxId)) return fail("merchantTransactionId em falta");

    const token = await getToken(cfg);
    const found = await lookupCharge(cfg, token, merchantTxId);
    if (!found || found.outcome === "pending") {
      return json({ received: true, state: found?.outcome ?? "unknown" });
    }
    const result = await applyOutcome(db, cfg, merchantTxId, found.outcome, {
      transactionId: found.transactionId,
    });
    return json({ received: true, state: found.outcome, applied: result.applied });
  } catch (err) {
    console.error("[appypay-webhook]", err);
    return fail("Erro interno", 500);
  }
}
