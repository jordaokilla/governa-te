import { longDate, shortTime } from "@/lib/format";
import type { Settings } from "@/lib/types";

/** Data e local tal como se podem anunciar hoje. */
export function eventWhen(s: Settings): string {
  const date = longDate(s.event_date);
  if (!date) return `${s.edition} · data a anunciar`;
  const start = shortTime(s.start_time);
  const end = shortTime(s.end_time);
  return start ? `${date}, ${start}${end ? ` às ${end}` : ""}` : date;
}

export function eventWhere(s: Settings): string {
  return [s.venue, s.city].filter(Boolean).join(" · ") || "Luanda";
}
