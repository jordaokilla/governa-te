// AppyPay (Multicaixa Express e pagamento por referência).
// OAuth2 por client_credentials e cobranças em /v2.0/charges.
// O estado de uma cobrança lê-se por GET /v2.0/charges?merchantTransactionId=…
// (GET /v2.0/charges/{id} responde 404).
// deno-lint-ignore-file no-explicit-any
import type { Config } from "./db.ts";

export type Method = "express" | "referencia";

const TOKEN_URL = "https://login.microsoftonline.com/auth.appypay.co.ao/oauth2/token";

export function methodId(cfg: Config, method: Method): string | undefined {
  return method === "express" ? cfg.appypay_method_express : cfg.appypay_method_reference;
}

export function isConfigured(cfg: Config, method?: Method): boolean {
  const base = Boolean(
    cfg.appypay_client_id && cfg.appypay_client_secret && cfg.appypay_resource && cfg.appypay_api_url,
  );
  if (!base) return false;
  return method ? Boolean(methodId(cfg, method)) : true;
}

/** merchantTransactionId: 15 caracteres alfanuméricos. */
export function newMerchantTxId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  return [...bytes].map((b) => chars[b % chars.length]).join("");
}

/** Descrição aceite pela AppyPay: sem acentos nem símbolos, maiúsculas, até 50 caracteres. */
export function safeDescription(text: string, max = 50): string {
  const out = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  return out.slice(0, max) || "GOVERNA TE";
}

export async function getToken(cfg: Config): Promise<string> {
  if (!isConfigured(cfg)) throw new Error("Credenciais da AppyPay por configurar");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: cfg.appypay_client_id!,
      client_secret: cfg.appypay_client_secret!,
      resource: cfg.appypay_resource!,
    }).toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`AppyPay recusou as credenciais (${res.status})`);
  const token = JSON.parse(text)?.access_token;
  if (!token) throw new Error("AppyPay não devolveu o token");
  return token as string;
}

export interface ChargeResult {
  outcome: "paid" | "failed" | "pending";
  message: string | null;
  transactionId: string | null;
  reference: { entity?: string; referenceNumber?: string; dueDate?: string } | null;
  raw: unknown;
}

function readCharge(parsed: any): ChargeResult {
  const rs = parsed?.responseStatus ?? {};
  const status = String(rs.status ?? "").toLowerCase();
  let outcome: ChargeResult["outcome"] = "pending";
  if (rs.successful === true && status === "success") outcome = "paid";
  else if (rs.successful === false || status === "failed") outcome = "failed";
  return {
    outcome,
    message: rs.message ?? null,
    transactionId: parsed?.transactionId ?? parsed?.id ?? null,
    reference: rs.reference ?? null,
    raw: parsed,
  };
}

export async function createCharge(
  cfg: Config,
  token: string,
  p: {
    merchantTransactionId: string;
    amount: number;
    method: Method;
    description: string;
    phone?: string;
    dueDate?: string;
  },
): Promise<ChargeResult> {
  const base: Record<string, unknown> = {
    merchantTransactionId: p.merchantTransactionId,
    amount: p.amount,
    currency: "AOA",
    description: p.description,
    paymentMethod: methodId(cfg, p.method),
  };
  if (p.method === "express" && p.phone) base.paymentInfo = { phoneNumber: p.phone };

  const post = (payload: Record<string, unknown>) =>
    fetch(`${cfg.appypay_api_url}/v2.0/charges`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  // Pede-se o prazo pretendido; se a AppyPay recusar o campo, repete-se sem ele.
  let res = await post(
    p.dueDate ? { ...base, dueDate: p.dueDate, expirationDate: p.dueDate } : base,
  );
  let text = await res.text();
  if (!res.ok && p.dueDate) {
    console.warn(`[appypay] prazo recusado (${res.status}); a repetir sem prazo próprio`);
    res = await post(base);
    text = await res.text();
  }
  console.log("[appypay] charge", p.merchantTransactionId, res.status, text.slice(0, 600));

  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    // Uma recusa com corpo legível (saldo, PIN, tempo esgotado) é um pagamento falhado, não um erro nosso.
    if (parsed?.responseStatus) return readCharge({ ...parsed, responseStatus: { ...parsed.responseStatus, successful: false } });
    throw new Error(`AppyPay respondeu ${res.status}`);
  }
  return readCharge(parsed);
}

const FAILED = new Set(["failed", "cancelled", "canceled", "expired", "rejected", "declined"]);

export interface ChargeLookup {
  outcome: "paid" | "failed" | "pending";
  transactionId: string | null;
  reference: { entity?: string; referenceNumber?: string; dueDate?: string } | null;
}

export async function lookupCharge(
  cfg: Config,
  token: string,
  merchantTxId: string,
): Promise<ChargeLookup | null> {
  const res = await fetch(
    `${cfg.appypay_api_url}/v2.0/charges?merchantTransactionId=${encodeURIComponent(merchantTxId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const text = await res.text();
  if (!res.ok) {
    console.warn("[appypay] lookup", merchantTxId, res.status, text.slice(0, 300));
    return null;
  }
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const list: any[] = Array.isArray(parsed?.payments) ? parsed.payments : [];
  const item = list.find((x) => x?.merchantTransactionId === merchantTxId);
  if (!item) return null;
  const status = String(item.status ?? "").toLowerCase();
  return {
    outcome: status === "success" ? "paid" : FAILED.has(status) ? "failed" : "pending",
    transactionId: item.id ?? null,
    reference: item.reference ?? null,
  };
}
