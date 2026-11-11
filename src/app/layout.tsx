import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import "@/lib/env";
import "@/lib/server-env";
import ConvexClerkProvider from "@/providers/ConvexClerkProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { siteName, siteOrigin } from "@/lib/metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description:
    "Create and manage educational fitness and meal plans with optional AI voice generation.",
  openGraph: {
    type: "website",
    siteName,
    title: siteName,
    description:
      "Create and manage educational fitness and meal plans with optional AI voice generation.",
    url: siteOrigin,
  },
  twitter: {
    card: "summary",
    title: siteName,
    description:
      "Create and manage educational fitness and meal plans with optional AI voice generation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}>
        <ConvexClerkProvider>
          <Navbar />

          {/* GRID BACKGROUND */}
          <div className="fixed inset-0 -z-10">
            <div className="absolute inset-0 bg-linear-to-b from-background via-background to-background"></div>
            <div className="absolute inset-0 bg-[linear-gradient(var(--cyber-grid-color)_1px,transparent_1px),linear-gradient(90deg,var(--cyber-grid-color)_1px,transparent_1px)] bg-size-[20px_20px]"></div>
          </div>

          <main className="pt-24 grow">{children}</main>
          <Footer />
        </ConvexClerkProvider>
      </body>
    </html>
  );
}
