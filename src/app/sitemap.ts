import type { MetadataRoute } from "next";
import { SAMPLE_PROGRAMS } from "@/constants";
import { siteOrigin } from "@/lib/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPaths = [
    "/",
    "/about",
    "/contact",
    "/help",
    "/privacy",
    "/terms",
  ];

  return [
    ...publicPaths.map((path) => ({
      url: new URL(path, siteOrigin).toString(),
      changeFrequency: path === "/" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "/" ? 1 : 0.5,
    })),
    ...SAMPLE_PROGRAMS.map((program) => ({
      url: new URL(`/programs/${program.id}`, siteOrigin).toString(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
