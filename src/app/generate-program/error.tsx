"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

export default function GenerateProgramError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="container mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">The generator ran into a problem</h1>
      <p className="text-muted-foreground">
        Your plan status is saved. Retry here or switch to the form generator.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Retry page</Button>
        <Button asChild variant="outline">
          <Link href="/generate-program/form">Use the form</Link>
        </Button>
      </div>
    </main>
  );
}
