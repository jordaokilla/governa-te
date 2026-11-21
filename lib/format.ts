const TZ = "Africa/Luanda";

export function kz(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(value)} Kz`;
}

/** «12 de Março de 2027» a partir de uma data AAAA-MM-DD. */
export function longDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  if (!y || !m || !d) return null;
  return `${d} de ${months[m - 1]} de ${y}`;
}

export function shortTime(time: string | null | undefined): string | null {
  if (!time) return null;
  const [h, m] = time.split(":");
  return `${h}h${m === "00" ? "" : m}`;
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short", timeZone: TZ }).format(new Date(iso));
}

export function dateTimeLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-AO", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
}

/** 244923456789 → 923 456 789 */
export function phone(value: string | null | undefined): string {
  const d = (value ?? "").replace(/\D/g, "").replace(/^244/, "");
  return d.length === 9 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : value ?? "";
}

export function validPhone(value: string): boolean {
  const d = value.replace(/\D/g, "").replace(/^244/, "");
  return /^9\d{8}$/.test(d);
}

export function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export const KIND_LABEL = { ticket: "Bilhete", exhibitor: "Expositor", sponsor: "Patrocínio" } as const;
export const KIND_PLURAL = { ticket: "Bilhetes", exhibitor: "Expositores", sponsor: "Patrocinadores" } as const;

export const STATUS_LABEL = {
  awaiting_payment: "Por pagar",
  processing: "A aguardar pagamento",
  paid: "Pago",
  expired: "Expirado",
  cancelled: "Cancelado",
} as const;
