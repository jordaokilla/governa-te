// Estado de um pedido pela ligação privada (token) e bilhete pela sua ligação.
// Enquanto o pagamento está em curso, confirma o estado na AppyPay (no máximo de 8 em 8 segundos).
// deno-lint-ignore-file no-explicit-any
import { allow, cleanText, clientIp, cors, fail, getConfig, json, serviceClient } from "../../_shared/db.ts";
import { publicOrder, syncOrder } from "../../_shared/payments.ts";

const TOKEN = /^[a-f0-9]{32}$/;

export async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const db = serviceClient();
    const url = new URL(req.url);
    const ip = clientIp(req);
    if (!(await allow(db, `status:ip:${ip}`, 240, 600))) return fail("Demasiados pedidos. Aguarde um pouco.", 429);

    // Bilhete individual (para partilhar com quem vai usar o lugar).
    const ticketToken = url.searchParams.get("ticket");
    if (req.method === "GET" && ticketToken) {
      if (!TOKEN.test(ticketToken)) return fail("Bilhete não encontrado.", 404);
      const { data: t } = await db
        .from("tickets")
        .select("code, seq, holder_name, product_name, status, checked_in_at, order_id")
        .eq("public_token", ticketToken)
        .maybeSingle();
      if (!t) return fail("Bilhete não encontrado.", 404);
      const { order_id: _o, ...ticket } = t as any;
      return json({ ticket });
    }

    if (req.method === "POST") {
      // Nome de quem vai usar o bilhete.
      const body = await req.json().catch(() => ({}));
      if (!TOKEN.test(String(body?.token ?? ""))) return fail("Pedido não encontrado.", 404);
      const holder = cleanText(body?.holder_name, 120);
      if (!holder || holder.length < 3) return fail("Indique o nome completo.");
      const { data: order } = await db.from("orders").select("id, status").eq("public_token", body.token).maybeSingle();
      if (!order || order.status !== "paid") return fail("Pedido não encontrado.", 404);
      const { data: updated } = await db
        .from("tickets")
        .update({ holder_name: holder })
        .eq("id", String(body?.ticket_id ?? ""))
        .eq("order_id", order.id)
        .eq("status", "valid")
        .select("id");
      if (!updated?.length) return fail("Este bilhete já não pode ser alterado.");
      return json({ ok: true });
    }

    const token = url.searchParams.get("t") ?? "";
    if (!TOKEN.test(token)) return fail("Pedido não encontrado.", 404);
    let { data: order } = await db.from("orders").select("*").eq("public_token", token).maybeSingle();
    if (!order) return fail("Pedido não encontrado.", 404);

    const stale = !order.last_checked_at || Date.now() - new Date(order.last_checked_at).getTime() > 8000;
    if (order.status === "processing" && stale) {
      try {
        await syncOrder(db, await getConfig(db), order.id);
        const again = await db.from("orders").select("*").eq("id", order.id).single();
        if (again.data) order = again.data;
      } catch (err) {
        console.error("[order-status] sync", err);
      }
    }
    return json({ order: await publicOrder(db, order) });
  } catch (err) {
    console.error("[order-status]", err);
    return fail("Ocorreu um erro. Tente de novo.", 500);
  }
}
