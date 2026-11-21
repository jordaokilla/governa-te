// Regras de pagamento de um pedido: iniciar uma tentativa, aplicar o estado
// confirmado pela AppyPay e devolver o pedido no formato que o site mostra.
// O estado «pago» só nasce de uma resposta da AppyPay (ou do painel), nunca do pedido do cliente.
// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { Config } from "./db.ts";
import {
  createCharge,
  getToken,
  isConfigured,
  lookupCharge,
  type Method,
  newMerchantTxId,
  safeDescription,
} from "./appypay.ts";
import { sendPaidEmail, sendReferenceEmail } from "./email.ts";

const EXPRESS_HOLD_MINUTES = 20;

async function siteUrl(db: SupabaseClient): Promise<string | null> {
  const { data } = await db.from("event_settings").select("site_url").maybeSingle();
  return (data as any)?.site_url ?? Deno.env.get("SITE_URL") ?? null;
}

function friendlyFailure(message: string | null | undefined): string {
  const m = (message ?? "").trim();
  if (!m) return "O pagamento não foi concluído. Pode tentar de novo.";
  return `O pagamento não foi concluído: ${m}`;
}

/** Aplica um estado final a uma tentativa. Idempotente. */
export async function applyOutcome(
  db: SupabaseClient,
  cfg: Config,
  merchantTxId: string,
  outcome: "paid" | "failed",
  info: { message?: string | null; transactionId?: string | null; raw?: unknown } = {},
): Promise<{ applied: boolean; orderId: string | null }> {
  const { data: payment } = await db
    .from("payments")
    .select("id, order_id, status")
    .eq("merchant_transaction_id", merchantTxId)
    .maybeSingle();
  if (!payment) return { applied: false, orderId: null };
  if (payment.status === "paid") return { applied: false, orderId: payment.order_id };

  const patch: Record<string, unknown> = { status: outcome, message: info.message ?? null };
  if (info.transactionId) patch.appypay_transaction_id = info.transactionId;
  if (info.raw !== undefined) patch.response = info.raw;

  if (outcome === "paid") {
    await db.from("payments").update(patch).eq("id", payment.id);
    const { data: first } = await db.rpc("service_mark_order_paid", {
      p_order: payment.order_id,
      p_by: "appypay",
    });
    if (first === true) {
      const { data: order } = await db.from("orders").select("*").eq("id", payment.order_id).maybeSingle();
      if (order) await sendPaidEmail(cfg, order, await siteUrl(db));
    }
    return { applied: true, orderId: payment.order_id };
  }

  // Falhou: só fecha a tentativa se ainda estava pendente.
  const { data: closed } = await db
    .from("payments")
    .update(patch)
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id");
  if (!closed?.length) return { applied: false, orderId: payment.order_id };

  // O pedido volta a aceitar pagamento se não houver outra tentativa em curso.
  const { count } = await db
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("order_id", payment.order_id)
    .eq("status", "pending");
  if (!count) {
    await db
      .from("orders")
      .update({
        status: "awaiting_payment",
        failure_reason: friendlyFailure(info.message),
        expires_at: new Date(Date.now() + EXPRESS_HOLD_MINUTES * 60_000).toISOString(),
      })
      .eq("id", payment.order_id)
      .eq("status", "processing");
  } else {
    // Ainda há uma referência por pagar: o pedido volta a mostrá-la.
    await db
      .from("orders")
      .update({ payment_method: "referencia", failure_reason: friendlyFailure(info.message) })
      .eq("id", payment.order_id)
      .eq("status", "processing")
      .not("appypay_reference", "is", null);
  }
  return { applied: true, orderId: payment.order_id };
}

/** Inicia uma tentativa de pagamento para um pedido que ainda aceita pagamento. */
export async function startPayment(
  db: SupabaseClient,
  cfg: Config,
  order: any,
  method: Method,
  phone: string | null,
): Promise<{ error?: string }> {
  if (order.status === "paid") return { error: "Este pedido já está pago." };
  if (order.status === "cancelled") return { error: "Este pedido foi cancelado." };
  if (order.status === "expired" || (order.expires_at && new Date(order.expires_at) < new Date() && order.status !== "processing")) {
    return { error: "O prazo deste pedido terminou. Faça um pedido novo." };
  }
  if (!isConfigured(cfg, method)) {
    return { error: "Este método de pagamento ainda não está disponível." };
  }
  if (method === "express" && !phone) {
    return { error: "Indique o número do Multicaixa Express (9XX XXX XXX)." };
  }

  const { data: pending } = await db
    .from("payments")
    .select("id, method, created_at, reference, due_at")
    .eq("order_id", order.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const recentExpress = (pending ?? []).find(
    (p: any) => p.method === "express" && Date.now() - new Date(p.created_at).getTime() < 90_000,
  );
  if (recentExpress) {
    return { error: "Já existe um pedido de pagamento em curso. Confirme-o no seu telemóvel ou aguarde um minuto." };
  }
  if (method === "referencia") {
    const live = (pending ?? []).find(
      (p: any) => p.method === "referencia" && p.reference && (!p.due_at || new Date(p.due_at) > new Date()),
    );
    if (live) {
      // A referência já emitida continua válida: volta a ser a forma de pagamento do pedido.
      await db.from("orders").update({ status: "processing", payment_method: "referencia", failure_reason: null }).eq("id", order.id);
      return {};
    }
  }

  const merchantTxId = newMerchantTxId();
  const amount = Number(order.amount);
  const { data: settings } = await db.from("event_settings").select("reference_hours, site_url").maybeSingle();
  const hours = Number((settings as any)?.reference_hours ?? 48);
  const dueAt = method === "referencia" ? new Date(Date.now() + hours * 3_600_000) : null;

  const { error: payErr } = await db.from("payments").insert({
    order_id: order.id,
    merchant_transaction_id: merchantTxId,
    method,
    amount,
  });
  if (payErr) {
    console.error("[payments] insert", payErr.message);
    return { error: "Não foi possível iniciar o pagamento. Tente de novo." };
  }

  await db
    .from("orders")
    .update({
      status: "processing",
      payment_method: method,
      failure_reason: null,
      last_checked_at: new Date().toISOString(),
      expires_at: (dueAt ?? new Date(Date.now() + EXPRESS_HOLD_MINUTES * 60_000)).toISOString(),
    })
    .eq("id", order.id);

  const description = safeDescription(`GOVERNA TE ${order.product_name}`);

  const run = async () => {
    try {
      const token = await getToken(cfg);
      const result = await createCharge(cfg, token, {
        merchantTransactionId: merchantTxId,
        amount,
        method,
        description,
        phone: method === "express" ? phone! : undefined,
        dueDate: dueAt ? dueAt.toISOString() : undefined,
      });

      if (result.outcome === "paid" || result.outcome === "failed") {
        await applyOutcome(db, cfg, merchantTxId, result.outcome, {
          message: result.message,
          transactionId: result.transactionId,
          raw: result.raw,
        });
        return;
      }

      const patch: Record<string, unknown> = { response: result.raw };
      if (result.transactionId) patch.appypay_transaction_id = result.transactionId;
      if (method === "referencia") {
        const ref = result.reference;
        if (!ref?.referenceNumber) {
          await applyOutcome(db, cfg, merchantTxId, "failed", {
            message: result.message ?? "A referência não foi gerada",
            raw: result.raw,
          });
          return;
        }
        // A AppyPay pode aplicar o seu próprio prazo: vale o que ela devolver.
        const realDue = ref.dueDate && !Number.isNaN(Date.parse(ref.dueDate)) ? new Date(ref.dueDate) : dueAt!;
        patch.entity = ref.entity ?? null;
        patch.reference = ref.referenceNumber;
        patch.due_at = realDue.toISOString();
        await db.from("payments").update(patch).eq("merchant_transaction_id", merchantTxId);
        await db
          .from("orders")
          .update({
            appypay_entity: ref.entity ?? null,
            appypay_reference: ref.referenceNumber,
            reference_due_at: realDue.toISOString(),
            expires_at: realDue.toISOString(),
          })
          .eq("id", order.id)
          .eq("status", "processing");
        await sendReferenceEmail(
          cfg,
          order,
          { entity: String(ref.entity ?? ""), reference: String(ref.referenceNumber), dueAt: realDue.toISOString() },
          (settings as any)?.site_url ?? null,
        );
      } else {
        await db.from("payments").update(patch).eq("merchant_transaction_id", merchantTxId);
      }
    } catch (err) {
      console.error("[payments] charge", err);
      await applyOutcome(db, cfg, merchantTxId, "failed", {
        message: "não foi possível contactar o serviço de pagamentos",
      });
    }
  };

  if (method === "referencia") {
    await run();
  } else {
    // O Multicaixa Express só responde depois de a pessoa confirmar no telemóvel:
    // a cobrança segue em segundo plano e a página vai perguntando pelo estado.
    const runtime = (globalThis as any).EdgeRuntime;
    if (runtime?.waitUntil) runtime.waitUntil(run());
    else await run();
  }
  return {};
}

/** Pergunta à AppyPay pelas tentativas pendentes de um pedido e aplica o que estiver decidido. */
export async function syncOrder(db: SupabaseClient, cfg: Config, orderId: string): Promise<void> {
  if (!isConfigured(cfg)) return;
  const { data: pending } = await db
    .from("payments")
    .select("merchant_transaction_id, method, created_at")
    .eq("order_id", orderId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(3);
  if (!pending?.length) return;
  await db.from("orders").update({ last_checked_at: new Date().toISOString() }).eq("id", orderId);
  const token = await getToken(cfg);
  for (const p of pending as any[]) {
    const found = await lookupCharge(cfg, token, p.merchant_transaction_id);
    if (found && found.outcome !== "pending") {
      await applyOutcome(db, cfg, p.merchant_transaction_id, found.outcome, {
        transactionId: found.transactionId,
      });
    }
  }
}

/** O pedido tal como o comprador o vê. Os bilhetes só saem depois de pago. */
export async function publicOrder(db: SupabaseClient, order: any): Promise<Record<string, unknown>> {
  let tickets: unknown[] = [];
  if (order.status === "paid") {
    const { data } = await db
      .from("tickets")
      .select("id, code, public_token, seq, holder_name, product_name, status, checked_in_at")
      .eq("order_id", order.id)
      .order("seq");
    tickets = data ?? [];
  }
  return {
    token: order.public_token,
    number: order.number,
    kind: order.kind,
    product_name: order.product_name,
    quantity: order.quantity,
    unit_price: Number(order.unit_price),
    amount: Number(order.amount),
    buyer_name: order.buyer_name,
    buyer_email: order.buyer_email,
    buyer_phone: order.buyer_phone,
    company_name: order.company_name,
    status: order.status,
    payment_method: order.payment_method,
    entity: order.status === "processing" ? order.appypay_entity : null,
    reference: order.status === "processing" ? order.appypay_reference : null,
    reference_due_at: order.status === "processing" ? order.reference_due_at : null,
    failure_reason: order.failure_reason,
    expires_at: order.expires_at,
    paid_at: order.paid_at,
    created_at: order.created_at,
    tickets,
  };
}
