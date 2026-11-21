// Compra pública: cria o pedido (preço e stock conferidos na base) e inicia o pagamento.
// Com `token`, paga um pedido que já existe (nova tentativa ou cobrança criada no painel).
// deno-lint-ignore-file no-explicit-any
import { allow, cleanEmail, cleanPhone, cleanText, clientIp, cors, fail, getConfig, json, serviceClient } from "../lib/db.ts";
import { isConfigured, type Method } from "../lib/appypay.ts";
import { publicOrder, startPayment } from "../lib/payments.ts";

export async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return fail("Método não suportado", 405);

  try {
    const body = await req.json().catch(() => ({}));
    const method = body?.method as Method;
    if (method !== "express" && method !== "referencia") return fail("Escolha a forma de pagamento.");

    const db = serviceClient();
    const ip = clientIp(req);
    if (!(await allow(db, `checkout:ip:${ip}`, 20, 600))) {
      return fail("Demasiados pedidos seguidos. Aguarde alguns minutos e tente de novo.", 429);
    }

    const cfg = await getConfig(db);
    if (!isConfigured(cfg, method)) {
      return fail("Os pagamentos online ainda não estão disponíveis. Tente mais tarde.", 503);
    }

    const payPhone = cleanPhone(body?.pay_phone ?? body?.phone);
    let order: any = null;

    if (typeof body?.token === "string" && /^[a-f0-9]{32}$/.test(body.token)) {
      const { data } = await db.from("orders").select("*").eq("public_token", body.token).maybeSingle();
      if (!data) return fail("Pedido não encontrado.", 404);
      order = data;
    } else {
      const name = cleanText(body?.name, 120);
      const email = cleanEmail(body?.email);
      const phone = cleanPhone(body?.phone);
      const quantity = Number.parseInt(String(body?.quantity ?? "1"), 10);
      if (!name || name.length < 3) return fail("Indique o seu nome completo.");
      if (!email) return fail("Indique um email válido.");
      if (!phone) return fail("Indique um telemóvel válido (9XX XXX XXX).");
      if (typeof body?.product_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.product_id)) {
        return fail("Produto inválido.");
      }
      if (!(await allow(db, `checkout:phone:${phone}`, 8, 3600))) {
        return fail("Demasiados pedidos com este telemóvel. Tente mais tarde.", 429);
      }

      const utm: Record<string, string> = {};
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer"]) {
        const v = cleanText(body?.utm?.[k], 200);
        if (v) utm[k] = v;
      }

      const { data: created, error } = await db.rpc("service_create_order", {
        p_product: body.product_id,
        p_quantity: quantity,
        p_name: name,
        p_email: email,
        p_phone: phone,
        p_company: cleanText(body?.company, 160),
        p_nif: cleanText(body?.nif, 20),
        p_notes: cleanText(body?.notes, 600),
        p_utm: Object.keys(utm).length ? utm : null,
      });
      if (error) {
        console.error("[checkout] create", error.message);
        return fail("Não foi possível criar o pedido. Tente de novo.", 500);
      }
      if ((created as any)?.error) return fail((created as any).error);

      const { data } = await db.from("orders").select("*").eq("id", (created as any).order_id).single();
      order = data;
    }

    const started = await startPayment(
      db,
      cfg,
      order,
      method,
      method === "express" ? (payPhone ?? cleanPhone(order.buyer_phone)) : null,
    );

    const { data: fresh } = await db.from("orders").select("*").eq("id", order.id).single();
    const payload = { token: order.public_token, order: await publicOrder(db, fresh) };
    // O pedido existe mesmo quando o pagamento não arrancou: a página do pedido deixa tentar de novo.
    if (started.error) return json({ ...payload, error: started.error }, body?.token ? 400 : 200);
    return json(payload);
  } catch (err) {
    console.error("[checkout]", err);
    return fail("Ocorreu um erro. Tente de novo dentro de momentos.", 500);
  }
}
