"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useClerk, useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { UnitPreference } from "@/lib/units";

export default function SettingsPage() {
  const { isLoaded } = useUser();
  const { signOut } = useClerk();
  const preference = useQuery(
    api.users.getUnitPreference,
    isLoaded ? {} : "skip",
  );
  const setUnitPreference = useMutation(api.plans.setUnitPreference);
  const exportMyData = useAction(api.accounts.exportMyData);
  const deleteMyAccount = useAction(api.accounts.deleteMyAccount);
  const [busy, setBusy] = useState<"units" | "export" | "delete" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function updatePreference(value: UnitPreference) {
    setError("");
    setMessage("");
    setBusy("units");
    try {
      await setUnitPreference({ preference: value });
      setMessage("Unit preference saved.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save your unit preference.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function downloadExport() {
    setError("");
    setMessage("");
    setBusy("export");
    try {
      const accountData = await exportMyData({});
      const file = new Blob([JSON.stringify(accountData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = "fitness-buddy-account-data.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setMessage("Your account data export has been downloaded.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not export your account data.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Permanently delete your Fitness Buddy data and Clerk account? This cannot be undone.",
    );
    if (!confirmed) return;

    setError("");
    setMessage("");
    setBusy("delete");
    try {
      await deleteMyAccount({});
      await signOut({ redirectUrl: "/" });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Account deletion did not complete.",
      );
      setBusy(null);
    }
  }

  return (
    <section className="container mx-auto max-w-3xl px-4 py-12">
      <header className="mb-8">
        <p className="mb-2 font-mono text-sm uppercase tracking-wide text-primary">
          Account
        </p>
        <h1 className="text-3xl font-bold">Settings and data</h1>
      </header>

      <div className="space-y-6">
        <Card className="space-y-4 border-border bg-card/80 p-6">
          <h2 className="text-xl font-semibold">Measurement units</h2>
          <p className="text-sm text-muted-foreground">
            Measurements are stored in centimeters and kilograms. This setting
            controls how they are displayed and how the form labels your input.
          </p>
          <label className="grid max-w-sm gap-2 text-sm">
            Display preference
            <select
              value={preference ?? "metric"}
              disabled={!isLoaded || preference === undefined || busy !== null}
              onChange={(event) =>
                void updatePreference(event.currentTarget.value as UnitPreference)
              }
              className="rounded border border-border bg-background px-3 py-2"
            >
              <option value="metric">Metric (cm, kg)</option>
              <option value="imperial">Imperial (ft/in, lb)</option>
            </select>
          </label>
        </Card>

        <Card className="space-y-4 border-border bg-card/80 p-6">
          <h2 className="text-xl font-semibold">Export your data</h2>
          <p className="text-sm text-muted-foreground">
            Download a JSON file containing your account profile, submitted
            plans and inputs, and application history.
          </p>
          <Button
            disabled={busy !== null}
            variant="outline"
            onClick={() => void downloadExport()}
          >
            {busy === "export" ? "Preparing export..." : "Download my data"}
          </Button>
        </Card>

        <Card className="space-y-4 border border-destructive/40 bg-card/80 p-6">
          <h2 className="text-xl font-semibold text-destructive">
            Delete account and data
          </h2>
          <p className="text-sm text-muted-foreground">
            This removes your Fitness Buddy profile, plans, generation and
            workout history, and your Clerk account. This action is permanent.
            It does not remove data already retained by third-party providers
            under their own policies.
          </p>
          <Button
            disabled={busy !== null}
            variant="destructive"
            onClick={() => void deleteAccount()}
          >
            {busy === "delete" ? "Deleting account..." : "Delete my account"}
          </Button>
        </Card>

        {(message || error) && (
          <p
            role={error ? "alert" : "status"}
            className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
          >
            {error || message}
          </p>
        )}
      </div>
    </section>
  );
}
