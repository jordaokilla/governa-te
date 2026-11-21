import { cacheLife, cacheTag } from "next/cache";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";
import type { Site } from "./types";

const EMPTY: Site = {
  settings: {
    event_name: "GOVERNA-TE",
    edition: "Edição 2027",
    event_date: null,
    start_time: null,
    end_time: null,
    venue: "Palácio da Justiça",
    city: "Luanda",
    venue_confirmed: false,
    capacity: 660,
    sales_open: false,
    contact_phone: null,
    contact_whatsapp: null,
    contact_email: null,
    instagram_url: "https://www.instagram.com/governa_te",
  },
  products: [],
  team: [],
};

/** Dados públicos do site (definições, catálogo publicado e equipa), guardados cerca de um minuto. */
export async function getSite(): Promise<Site> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  cacheTag("site");
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_site`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) throw new Error(`public_site ${res.status}`);
    const data = (await res.json()) as Site;
    return {
      settings: { ...EMPTY.settings, ...(data.settings ?? {}) },
      products: (data.products ?? []).map((p) => ({ ...p, price: p.price === null ? null : Number(p.price) })),
      team: data.team ?? [],
    };
  } catch (err) {
    console.error("[site]", err);
    return EMPTY;
  }
}
