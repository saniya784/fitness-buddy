import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "Fitness Plan Form",
  "Enter your goals, experience, schedule, equipment, and preferences to generate an educational plan.",
  "/generate-program/form",
  true,
);

export default function FormGeneratorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
