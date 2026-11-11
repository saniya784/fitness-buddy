import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig = (phase: string): NextConfig => {
  const config: NextConfig = {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "X-Frame-Options", value: "SAMEORIGIN" },
            {
              key: "Permissions-Policy",
              value: "microphone=(self), camera=(), geolocation=(), payment=()",
            },
          ],
        },
      ];
    },
    turbopack: {
      root: process.cwd(),
    },
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "randomuser.me",
        },
        {
          protocol: "https",
          hostname: "img.clerk.com",
        },
        {
          protocol: "https",
          hostname: "images.clerk.dev",
        },
      ],
    },
  };

  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
    ? withSentryConfig(config, {
        silent: true,
        webpack: { treeshake: { removeDebugLogging: true } },
      })
    : config;
};

export default nextConfig;
