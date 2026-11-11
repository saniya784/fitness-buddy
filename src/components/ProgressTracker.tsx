"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatWeight, weightToKilograms, type UnitPreference } from "@/lib/units";
import { Button } from "@/components/ui/button";

function currentStreak(dates: string[]) {
  const sorted = [...new Set(dates)].sort((left, right) =>
    right.localeCompare(left),
  );
  if (!sorted.length) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    const expected = new Date(`${sorted[index - 1]}T00:00:00.000Z`);
    expected.setUTCDate(expected.getUTCDate() - 1);
    if (sorted[index] !== expected.toISOString().slice(0, 10)) break;
    streak += 1;
  }
  return streak;
}

export default function ProgressTracker({
  units,
}: {
  units: UnitPreference;
}) {
  const measurements = useQuery(api.plans.getMeasurements, {});
  const addMeasurement = useMutation(api.plans.addMeasurement);
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [chest, setChest] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const recent = measurements ?? [];
  const streak = currentStreak(recent.map((item) => item.date));
  const chartData = [...recent]
    .reverse()
    .map((item) => ({
      ...item,
      displayWeight:
        units === "imperial" ? item.weightKg * 2.20462262 : item.weightKg,
    }));
  const weights = chartData.map((item) => item.displayWeight);
  const minimum = Math.min(...weights);
  const maximum = Math.max(...weights);
  const spread = Math.max(maximum - minimum, 1);
  const points = chartData
    .map((item, index) => {
      const x = chartData.length < 2 ? 250 : 24 + (index / (chartData.length - 1)) * 452;
      const y = 130 - ((item.displayWeight - minimum) / spread) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      if (!weight || !Number.isFinite(Number(weight))) {
        throw new Error("Enter a valid body weight.");
      }
      const toCm = (value: string) =>
        value ? Number(value) * (units === "imperial" ? 2.54 : 1) : undefined;
      await addMeasurement({
        weightKg: weightToKilograms(Number(weight), units),
        ...(toCm(waist) !== undefined ? { waistCm: toCm(waist) } : {}),
        ...(toCm(hip) !== undefined ? { hipCm: toCm(hip) } : {}),
        ...(toCm(chest) !== undefined ? { chestCm: toCm(chest) } : {}),
      });
      setWeight("");
      setWaist("");
      setHip("");
      setChest("");
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Measurement could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="no-print space-y-5 rounded-lg border border-border bg-card/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Progress</h3>
          <p className="text-sm text-muted-foreground">Measurements are private to your account.</p>
        </div>
        <p className="rounded border border-primary/30 px-3 py-2 text-sm">
          Logging streak: <strong>{streak} {streak === 1 ? "day" : "days"}</strong>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: `Weight (${units === "metric" ? "kg" : "lb"})`, value: weight, set: setWeight },
          { label: `Waist (${units === "metric" ? "cm" : "in"})`, value: waist, set: setWaist },
          { label: `Hip (${units === "metric" ? "cm" : "in"})`, value: hip, set: setHip },
          { label: `Chest (${units === "metric" ? "cm" : "in"})`, value: chest, set: setChest },
        ].map((field) => (
          <label key={field.label} className="grid gap-1 text-sm">
            {field.label}
            <input
              type="number"
              min="0"
              step="0.1"
              value={field.value}
              onChange={(event) => field.set(event.currentTarget.value)}
              className="rounded border border-border bg-background px-3 py-2"
            />
          </label>
        ))}
      </div>
      <Button disabled={busy} onClick={() => void save()}>
        {busy ? "Saving…" : "Log today’s measurements"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {saved && <p role="status" className="text-sm text-primary">Measurements saved.</p>}

      {!recent.length ? (
        <p className="text-sm text-muted-foreground">Log a measurement to start your chart.</p>
      ) : (
        <div>
          <div className="mb-2 flex justify-between text-sm text-muted-foreground">
            <span>Body weight trend ({units === "metric" ? "kg" : "lb"})</span>
            <span>
              {formatWeight(recent[0].weightKg, units)} ·{" "}
              {new Date(`${recent[0].date}T00:00:00`).toLocaleDateString()}
            </span>
          </div>
          <svg
            viewBox="0 0 500 160"
            role="img"
            aria-label={`Body weight trend across ${chartData.length} logged measurements`}
            className="h-40 w-full overflow-visible rounded border border-border bg-background/60"
          >
            <line x1="24" y1="140" x2="476" y2="140" stroke="currentColor" opacity="0.25" />
            {chartData.length > 1 && (
              <polyline
                points={points}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            )}
            {chartData.map((item, index) => {
              const x = chartData.length < 2 ? 250 : 24 + (index / (chartData.length - 1)) * 452;
              const y = 130 - ((item.displayWeight - minimum) / spread) * 100;
              return (
                <circle
                  key={item._id}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="var(--color-primary)"
                >
                  <title>{`${item.date}: ${formatWeight(item.weightKg, units)}`}</title>
                </circle>
              );
            })}
          </svg>
          <p className="mt-2 text-xs text-muted-foreground">
            {chartData.length} most recent records, newest on the right.
          </p>
        </div>
      )}
    </section>
  );
}
