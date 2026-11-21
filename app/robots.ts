import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/activar", "/pedido", "/bilhete", "/comprar", "/meus-bilhetes", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
