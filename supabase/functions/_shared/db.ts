// Base comum das funções: cliente de serviço, configuração, CORS e travões.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function fail(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type Config = Record<string, string | undefined>;

const ENV_OVERRIDES: Record<string, string> = {
  appypay_client_id: "APPYPAY_CLIENT_ID",
  appypay_client_secret: "APPYPAY_CLIENT_SECRET",
  appypay_resource: "APPYPAY_RESOURCE",
  appypay_api_url: "APPYPAY_API_URL",
  appypay_method_express: "APPYPAY_METHOD_MCEXPRESS",
  appypay_method_reference: "APPYPAY_METHOD_PREFERENCIA",
  resend_api_key: "RESEND_API_KEY",
  email_from: "EMAIL_FROM",
};

/** Configuração guardada no painel (Vault); um segredo da função com o mesmo nome manda. */
export async function getConfig(db: SupabaseClient): Promise<Config> {
  const { data, error } = await db.rpc("service_get_config");
  if (error) throw new Error(`Configuração indisponível: ${error.message}`);
  const cfg: Config = { ...(data as Config) };
  for (const [key, envName] of Object.entries(ENV_OVERRIDES)) {
    const v = Deno.env.get(envName);
    if (v && v.trim()) cfg[key] = v.trim();
  }
  return cfg;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "desconhecido";
}

/** true quando o pedido cabe no limite. Em caso de erro deixa passar, para não travar vendas. */
export async function allow(
  db: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await db.rpc("rate_limit_hit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit]", error.message);
    return true;
  }
  return data === true;
}

/** Telemóvel angolano no formato 2449XXXXXXXX, ou null. */
export function cleanPhone(value: unknown): string | null {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00244")) digits = digits.slice(2);
  if (digits.length === 9) digits = "244" + digits;
  return /^2449\d{8}$/.test(digits) ? digits : null;
}

export function cleanEmail(value: unknown): string | null {
  const email = String(value ?? "").trim().toLowerCase();
  return email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

export function cleanText(value: unknown, max: number): string | null {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length === y.length ? 0 : 1;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
