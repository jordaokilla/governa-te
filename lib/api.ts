import { API_URL, SUPABASE_KEY, SUPABASE_URL } from "./config";
import type { Order, Site, Ticket } from "./types";

export class ApiError extends Error {}

async function call<T>(route: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/${route}`, {
      ...init,
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError("Sem ligação ao servidor. Verifique a sua internet e tente de novo.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error ?? "Ocorreu um erro. Tente de novo.");
  return data as T;
}

export interface CheckoutInput {
  product_id?: string;
  token?: string;
  quantity?: number;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  nif?: string;
  notes?: string;
  method: "express" | "referencia";
  pay_phone?: string;
  utm?: Record<string, string>;
}

export const api = {
  checkout: (input: CheckoutInput) =>
    call<{ token: string; order: Order; error?: string }>("checkout", { method: "POST", body: JSON.stringify(input) }),
  order: (token: string) => call<{ order: Order }>(`order-status?t=${encodeURIComponent(token)}`),
  ticket: (token: string) =>
    call<{ ticket: Pick<Ticket, "code" | "seq" | "holder_name" | "product_name" | "status" | "checked_in_at"> }>(
      `order-status?ticket=${encodeURIComponent(token)}`,
    ),
  setHolder: (token: string, ticketId: string, holderName: string) =>
    call<{ ok: true }>("order-status", {
      method: "POST",
      body: JSON.stringify({ token, ticket_id: ticketId, holder_name: holderName }),
    }),
  lead: (input: Record<string, unknown>) =>
    call<{ ok: true }>("public-forms", { method: "POST", body: JSON.stringify({ action: "lead", ...input }) }),
  myTickets: (email: string, phone: string) =>
    call<{ orders: { public_token: string; number: number; product_name: string; quantity: number; amount: number; status: Order["status"]; created_at: string }[] }>(
      "public-forms",
      { method: "POST", body: JSON.stringify({ action: "my-tickets", email, phone }) },
    ),
  admin: <T>(body: Record<string, unknown>, accessToken?: string) =>
    call<T>("admin", {
      method: "POST",
      body: JSON.stringify(body),
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    }),
};

/** Catálogo fresco, lido no navegador (a página de compra não usa a cópia guardada). */
export async function fetchSite(): Promise<Site> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_site`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new ApiError("Não foi possível carregar os dados. Tente de novo.");
  const data = (await res.json()) as Site;
  return { ...data, products: (data.products ?? []).map((p) => ({ ...p, price: p.price === null ? null : Number(p.price) })) };
}
