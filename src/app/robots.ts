import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/contact", "/help", "/privacy", "/terms", "/programs/"],
      disallow: [
        "/generate-program",
        "/profile",
        "/settings",
        "/shared",
        "/unsubscribe",
        "/api/",
      ],
    },
    sitemap: new URL("/sitemap.xml", siteOrigin).toString(),
  };
}
