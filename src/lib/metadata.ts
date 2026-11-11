import type { Metadata } from "next";
import { env } from "./env";

export const siteName = "Fitness Buddy AI";
export const siteOrigin = (() => {
  if (env.NEXT_PUBLIC_SITE_URL) return env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL must be configured in production.");
  }
  return "http://localhost:3000";
})();

export function pageMetadata(
  title: string,
  description: string,
  path: string,
  privatePage = false,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName,
      title,
      description,
      url: path,
    },
    ...(privatePage
      ? { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } }
      : {}),
  };
}
