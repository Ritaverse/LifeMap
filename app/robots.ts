import type { MetadataRoute } from "next";
import { publicSiteUrl } from "./lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/objects", "/privacy", "/terms", "/digital-delivery", "/refund", "/support"],
      disallow: [
        "/onboarding",
        "/generating",
        "/today",
        "/insights/",
        "/life-map",
        "/ask",
        "/iching",
        "/timing",
        "/report",
        "/me",
      ],
    },
    sitemap: new URL("/sitemap.xml", publicSiteUrl).toString(),
    host: publicSiteUrl.origin,
  };
}
