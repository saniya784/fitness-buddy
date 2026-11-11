import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Generate a Plan",
  "Create an educational fitness plan using the accessible form or optional voice interface.",
  "/generate-program",
  true,
);

export default function GenerateProgramLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
