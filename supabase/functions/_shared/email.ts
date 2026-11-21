// Emails ao comprador pelo Resend. Sem chave configurada, não envia nada:
// o bilhete está sempre disponível na página do pedido.
// deno-lint-ignore-file no-explicit-any
import type { Config } from "./db.ts";

const kz = (n: number) => `${new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(n)} Kz`;
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="pt"><body style="margin:0;background:#0b0b0c;font-family:Arial,Helvetica,sans-serif;color:#f5f2ea">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0c"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#151517;border:1px solid #2a2a2e;border-radius:14px">
<tr><td style="padding:28px 28px 8px"><div style="font-size:13px;letter-spacing:3px;color:#d9b15a;font-weight:bold">GOVERNA-TE</div>
<h1 style="margin:14px 0 0;font-size:22px;line-height:1.3;color:#ffffff">${esc(title)}</h1></td></tr>
<tr><td style="padding:12px 28px 28px;font-size:15px;line-height:1.6;color:#d6d2c8">${body}</td></tr>
</table>
<div style="margin-top:16px;font-size:12px;color:#8a857c">A geração por quem se espera.</div>
</td></tr></table></body></html>`;
}

function button(url: string, label: string): string {
  return `<p style="margin:22px 0 6px"><a href="${esc(url)}" style="display:inline-block;background:#d9b15a;color:#111111;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:10px">${esc(label)}</a></p>`;
}

async function send(cfg: Config, to: string, subject: string, html: string): Promise<void> {
  if (!cfg.resend_api_key || !cfg.email_from || !to) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.resend_api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: cfg.email_from, to: [to], subject, html }),
    });
    if (!res.ok) console.error("[email]", res.status, (await res.text()).slice(0, 300));
  } catch (err) {
    console.error("[email]", err);
  }
}

export function orderUrl(siteUrl: string | null | undefined, token: string): string | null {
  if (!siteUrl) return null;
  return `${siteUrl.replace(/\/+$/, "")}/pedido?t=${token}`;
}

export async function sendPaidEmail(cfg: Config, order: any, siteUrl: string | null): Promise<void> {
  const url = orderUrl(siteUrl, order.public_token);
  const tickets = (order.tickets_per_unit ?? 0) * (order.quantity ?? 1);
  const body =
    `<p>Olá, ${esc(order.buyer_name)}.</p>` +
    `<p>Recebemos o seu pagamento de <strong style="color:#fff">${kz(Number(order.amount))}</strong> ` +
    `referente a <strong style="color:#fff">${esc(order.product_name)}</strong> (pedido n.º ${esc(order.number)}).</p>` +
    (tickets > 0
      ? `<p>${tickets === 1 ? "O seu bilhete está pronto" : `Os seus ${tickets} bilhetes estão prontos`}. ` +
        `Apresente o código QR à entrada.</p>`
      : `<p>A organização entra em contacto consigo para os passos seguintes.</p>`) +
    (url ? button(url, tickets > 0 ? "Ver os meus bilhetes" : "Ver o pedido") : "");
  await send(cfg, order.buyer_email, "Pagamento confirmado · GOVERNA-TE", layout("Pagamento confirmado", body));
}

export async function sendReferenceEmail(
  cfg: Config,
  order: any,
  ref: { entity: string; reference: string; dueAt: string | null },
  siteUrl: string | null,
): Promise<void> {
  const url = orderUrl(siteUrl, order.public_token);
  const due = ref.dueAt
    ? new Intl.DateTimeFormat("pt-AO", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Luanda" }).format(new Date(ref.dueAt))
    : null;
  const row = (k: string, v: string) =>
    `<tr><td style="padding:8px 0;color:#a8a39a">${k}</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#fff;font-size:17px">${esc(v)}</td></tr>`;
  const body =
    `<p>Olá, ${esc(order.buyer_name)}.</p>` +
    `<p>Para concluir o pedido n.º ${esc(order.number)} (${esc(order.product_name)}), pague por referência no Multicaixa, ` +
    `no Multicaixa Express ou no internet banking do seu banco:</p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2a2a2e;border-bottom:1px solid #2a2a2e;margin:8px 0">` +
    row("Entidade", ref.entity) + row("Referência", ref.reference) + row("Valor", kz(Number(order.amount))) +
    `</table>` +
    (due ? `<p>A referência é válida até ${esc(due)}.</p>` : "") +
    (url ? button(url, "Acompanhar o pedido") : "");
  await send(cfg, order.buyer_email, "Dados para pagamento · GOVERNA-TE", layout("Dados para pagamento", body));
}
