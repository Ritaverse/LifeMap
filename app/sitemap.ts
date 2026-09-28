import type { MetadataRoute } from "next";
import { products } from "./lib/data";
import { publicSiteUrl } from "./lib/site-config";

const publicRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/objects", changeFrequency: "weekly", priority: 0.7 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/digital-delivery", changeFrequency: "yearly", priority: 0.3 },
  { path: "/refund", changeFrequency: "yearly", priority: 0.3 },
  { path: "/support", changeFrequency: "monthly", priority: 0.4 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...publicRoutes.map(({ path, changeFrequency, priority }) => ({
      url: new URL(path, publicSiteUrl).toString(),
      changeFrequency,
      priority,
    })),
    ...products.map((product) => ({
      url: new URL(`/objects/${product.slug}`, publicSiteUrl).toString(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
