import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import UnsubscribeClient from "./UnsubscribeClient";

export const metadata = pageMetadata(
  "Unsubscribe",
  "Update email reminder preferences.",
  "/unsubscribe",
  true,
);

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <main className="container mx-auto max-w-2xl px-4 py-16">
      <Suspense fallback={<p role="status">Loading unsubscribe options…</p>}>
        <UnsubscribeClient token={token} />
      </Suspense>
    </main>
  );
}
