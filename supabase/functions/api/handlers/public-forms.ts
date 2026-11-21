// Formulários públicos: lista de espera, pedidos de proposta e «os meus bilhetes».
// deno-lint-ignore-file no-explicit-any
import { allow, cleanEmail, cleanPhone, cleanText, clientIp, cors, fail, json, serviceClient } from "../../_shared/db.ts";

const KINDS = new Set(["waitlist", "exhibitor", "sponsor", "contact"]);

export async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return fail("Método não suportado", 405);

  try {
    const body = await req.json().catch(() => ({}));
    const db = serviceClient();
    const ip = clientIp(req);

    if (body?.action === "my-tickets") {
      if (!(await allow(db, `lookup:ip:${ip}`, 8, 600))) return fail("Demasiadas tentativas. Aguarde alguns minutos.", 429);
      const email = cleanEmail(body?.email);
      const phone = cleanPhone(body?.phone);
      if (!email || !phone) return fail("Indique o email e o telemóvel usados na compra.");
      const { data } = await db
        .from("orders")
        .select("public_token, number, product_name, quantity, amount, status, created_at")
        .eq("buyer_email", email)
        .eq("buyer_phone", phone)
        .in("status", ["paid", "processing", "awaiting_payment"])
        .order("created_at", { ascending: false })
        .limit(20);
      return json({ orders: (data ?? []).map((o: any) => ({ ...o, amount: Number(o.amount) })) });
    }

    if (body?.action === "lead") {
      if (!(await allow(db, `lead:ip:${ip}`, 6, 600))) return fail("Demasiados pedidos. Aguarde alguns minutos.", 429);
      const kind = String(body?.kind ?? "");
      if (!KINDS.has(kind)) return fail("Pedido inválido.");
      const name = cleanText(body?.name, 120);
      const email = cleanEmail(body?.email);
      const phone = cleanPhone(body?.phone);
      if (!name || name.length < 3) return fail("Indique o seu nome.");
      if (!phone) return fail("Indique um telemóvel válido (9XX XXX XXX).");
      if (body?.email && !email) return fail("O email não parece válido.");
      if (kind !== "waitlist" && !email) return fail("Indique um email válido.");

      let productName: string | null = null;
      let productId: string | null = null;
      if (typeof body?.product_id === "string" && /^[0-9a-f-]{36}$/i.test(body.product_id)) {
        const { data: p } = await db.from("products").select("id, name").eq("id", body.product_id).eq("is_published", true).maybeSingle();
        if (p) {
          productId = p.id;
          productName = p.name;
        }
      }

      const { error } = await db.from("leads").insert({
        kind,
        name,
        email,
        phone,
        company: cleanText(body?.company, 160),
        message: cleanText(body?.message, 1500),
        product_id: productId,
        product_name: productName,
      });
      if (error) {
        console.error("[public-forms] lead", error.message);
        return fail("Não foi possível registar o pedido. Tente de novo.", 500);
      }
      return json({ ok: true });
    }

    return fail("Pedido inválido.");
  } catch (err) {
    console.error("[public-forms]", err);
    return fail("Ocorreu um erro. Tente de novo.", 500);
  }
}
