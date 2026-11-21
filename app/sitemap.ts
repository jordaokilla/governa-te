import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://governa-te.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/bilhetes", "/expositores", "/patrocinadores"].map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly" }));
}
