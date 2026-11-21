// Painel: activação de um convite de administrador (define a palavra-passe)
// e teste das credenciais da AppyPay.
// deno-lint-ignore-file no-explicit-any
import { allow, cleanText, clientIp, cors, fail, getConfig, json, serviceClient, sha256Hex } from "../lib/db.ts";
import { getToken, isConfigured } from "../lib/appypay.ts";

async function findInvite(db: any, code: unknown) {
  if (typeof code !== "string" || !/^[a-f0-9]{36}$/.test(code)) return null;
  const { data } = await db
    .from("admin_invites")
    .select("id, email, name, expires_at, used_at")
    .eq("code_hash", await sha256Hex(code))
    .maybeSingle();
  if (!data || data.used_at || new Date(data.expires_at) < new Date()) return null;
  return data;
}

export async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return fail("Método não suportado", 405);

  try {
    const body = await req.json().catch(() => ({}));
    const db = serviceClient();
    const ip = clientIp(req);

    if (body?.action === "invite-info" || body?.action === "activate") {
      if (!(await allow(db, `invite:ip:${ip}`, 15, 600))) return fail("Demasiadas tentativas. Aguarde alguns minutos.", 429);
      const invite = await findInvite(db, body?.code);
      if (!invite) return fail("Esta ligação de activação não é válida ou já foi usada.", 404);
      if (body.action === "invite-info") return json({ email: invite.email, name: invite.name });

      const password = String(body?.password ?? "");
      if (password.length < 10) return fail("A palavra-passe deve ter pelo menos 10 caracteres.");
      const name = cleanText(body?.name, 120) ?? invite.name;

      let userId: string | null = null;
      const { data: existing } = await db.rpc("service_user_id_by_email", { p_email: invite.email });
      if (existing) {
        const { error } = await db.auth.admin.updateUserById(existing as string, { password, email_confirm: true });
        if (error) return fail("Não foi possível definir a palavra-passe. Escolha outra.");
        userId = existing as string;
      } else {
        const { data, error } = await db.auth.admin.createUser({
          email: invite.email,
          password,
          email_confirm: true,
          user_metadata: { name },
        });
        if (error || !data?.user) {
          console.error("[admin-api] createUser", error?.message);
          return fail("Não foi possível criar a conta. Escolha outra palavra-passe.");
        }
        userId = data.user.id;
      }

      const { error: upErr } = await db
        .from("admins")
        .upsert({ user_id: userId, email: invite.email, name }, { onConflict: "user_id" });
      if (upErr) {
        console.error("[admin-api] admins", upErr.message);
        return fail("Não foi possível concluir a activação.", 500);
      }
      await db.from("admin_invites").update({ used_at: new Date().toISOString() }).eq("id", invite.id);
      return json({ ok: true, email: invite.email });
    }

    // Daqui para baixo, só administradores com sessão.
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData } = await db.auth.getUser(jwt);
    const uid = userData?.user?.id;
    if (!uid) return fail("Sessão inválida.", 401);
    const { data: adminRow } = await db.from("admins").select("user_id").eq("user_id", uid).maybeSingle();
    if (!adminRow) return fail("Sem permissão.", 403);

    if (body?.action === "test-appypay") {
      const cfg = await getConfig(db);
      if (!isConfigured(cfg)) return json({ ok: false, message: "Faltam credenciais: preencha o Client ID, o Client Secret e o Resource." });
      try {
        await getToken(cfg);
      } catch (err) {
        return json({ ok: false, message: err instanceof Error ? err.message : "A AppyPay recusou as credenciais." });
      }
      const missing = [
        !cfg.appypay_method_express && "Multicaixa Express",
        !cfg.appypay_method_reference && "Referência",
      ].filter(Boolean);
      return json({
        ok: true,
        message: missing.length
          ? `A AppyPay aceitou as credenciais. Falta o identificador do método: ${missing.join(" e ")}.`
          : "A AppyPay aceitou as credenciais. Os dois métodos estão configurados.",
      });
    }

    return fail("Pedido inválido.");
  } catch (err) {
    console.error("[admin-api]", err);
    return fail("Ocorreu um erro. Tente de novo.", 500);
  }
}
