"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";

export default function UnsubscribeClient({ token }: { token: string }) {
  const unsubscribe = useMutation(api.reminders.unsubscribe);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <section className="space-y-4 rounded border border-border bg-card/70 p-6">
      <h1 className="text-2xl font-bold">Workout reminder preferences</h1>
      <p className="text-muted-foreground">
        Confirm to stop recurring workout reminder emails for this account.
      </p>
      <Button
        disabled={busy || token.length !== 64}
        onClick={async () => {
          setBusy(true);
          setError("");
          setStatus("");
          try {
            await unsubscribe({ token });
            setStatus("You have been unsubscribed from workout reminder emails.");
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not update your preference.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Updating…" : "Unsubscribe"}
      </Button>
      {status && <p role="status" className="text-sm text-primary">{status}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
