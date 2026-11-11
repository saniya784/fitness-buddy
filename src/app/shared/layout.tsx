import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Shared Plan",
  "Read-only workout and nutrition plan shared by its owner.",
  "/shared",
  true,
);

export default function SharedPlanLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
