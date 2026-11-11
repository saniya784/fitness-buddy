import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);
const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional(),
);
const optionalEmail = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().email().optional(),
);

const envSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  NEXT_PUBLIC_CONVEX_SITE_URL: optionalUrl,
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: optionalString,
  NEXT_PUBLIC_VAPI_PUBLIC_KEY: optionalString,
  NEXT_PUBLIC_VAPI_ASSISTANT_ID: optionalString,
  NEXT_PUBLIC_SUPPORT_EMAIL: optionalEmail,
});

const parsedEnv = envSchema.parse({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_VAPI_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY,
  NEXT_PUBLIC_VAPI_ASSISTANT_ID: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID,
  NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
});

if (process.env.NODE_ENV === "production") {
  if (!parsedEnv.NEXT_PUBLIC_SITE_URL) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be set to the public HTTPS origin in production.",
    );
  }

  const siteUrl = new URL(parsedEnv.NEXT_PUBLIC_SITE_URL);
  if (
    siteUrl.protocol !== "https:" ||
    ["localhost", "127.0.0.1", "[::1]"].includes(siteUrl.hostname)
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must use the public HTTPS production origin.",
    );
  }
}

export const env = parsedEnv;
