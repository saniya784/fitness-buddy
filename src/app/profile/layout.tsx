import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata(
  "My Profile",
  "Manage your private fitness plans, workout history, progress, and reminders.",
  "/profile",
  true,
);

export default function ProfileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
