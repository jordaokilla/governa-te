import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://governa-te.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/activar", "/pedido", "/bilhete", "/comprar", "/meus-bilhetes", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
