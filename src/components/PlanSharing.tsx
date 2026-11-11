"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";

export default function PlanSharing({ plan }: { plan: Doc<"plans"> }) {
  const shares = useQuery(api.plans.getPlanShares, { planId: plan._id });
  const createShare = useMutation(api.plans.createPlanShare);
  const revokeShare = useMutation(api.plans.revokePlanShare);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function create() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await createShare({ planId: plan._id });
      const url = `${window.location.origin}/shared/${result.shareToken}`;
      try {
        await navigator.clipboard.writeText(url);
        setMessage("Read-only share link created and copied.");
      } catch {
        setMessage("Read-only share link created. Copy it from the link list below.");
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create the share link.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function revoke(shareId: Id<"planShares">) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await revokeShare({ shareId });
      setMessage("Share link revoked.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Share link could not be revoked.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="no-print space-y-4 rounded-lg border border-border bg-card/60 p-5">
      <div>
        <h3 className="text-lg font-semibold">Share plan</h3>
        <p className="text-sm text-muted-foreground">
          Anyone with the link can view the workout and diet only. Personal details are not shared.
        </p>
      </div>
      <Button disabled={busy} onClick={() => void create()}>
        Create read-only link
      </Button>
      {shares?.length ? (
        <ul className="space-y-2">
          {shares.map((share) => (
            <li key={share._id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-3">
              <a
                href={`/shared/${share.shareToken}`}
                className="max-w-full break-all text-xs text-primary underline"
              >
                /shared/{share.shareToken}
              </a>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${window.location.origin}/shared/${share.shareToken}`,
                      );
                      setMessage("Share link copied.");
                      setError("");
                    } catch {
                      setError("Could not copy the link. Copy it from the address shown.");
                    }
                  }}
                >
                  Copy
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => void revoke(share._id)}
                >
                  Revoke
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : shares === undefined ? (
        <p role="status" className="text-sm text-muted-foreground">Loading shares…</p>
      ) : (
        <p className="text-sm text-muted-foreground">No active share links.</p>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
    </section>
  );
}
