"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { heightToCentimeters, weightToKilograms } from "@/lib/units";

export default function FormProgramPage() {
  const router = useRouter();
  const unitPreference = useQuery(api.users.getUnitPreference, {});
  const generateFromForm = useAction(api.generation.generateFromForm);
  const retryFailedPlan = useMutation(api.plans.retryFailedPlan);
  const [planId, setPlanId] = useState<Id<"plans"> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [medicalDisclaimerAccepted, setMedicalDisclaimerAccepted] =
    useState(false);
  const plan = useQuery(
    api.plans.getPlan,
    planId ? { planId } : "skip",
  );

  useEffect(() => {
    if (plan?.status === "ready") {
      router.push("/profile");
    }
  }, [plan?.status, router]);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const units = unitPreference ?? "metric";
    const equipment = String(formData.get("equipment") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const newPlanId = await generateFromForm({
        input: {
          age: Number(formData.get("age")),
          heightCm: heightToCentimeters(Number(formData.get("height")), units),
          weightKg: weightToKilograms(Number(formData.get("weight")), units),
          goal: String(formData.get("goal") ?? "").trim(),
          level: String(formData.get("level") ?? ""),
          daysPerWeek: Number(formData.get("daysPerWeek")),
          equipment,
          injuries: String(formData.get("injuries") ?? "").trim() || "none",
          dietaryRestrictions:
            String(formData.get("dietaryRestrictions") ?? "").trim() || "none",
        },
        medicalDisclaimerAccepted,
      });
      setPlanId(newPlanId);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Your plan couldn't be queued. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function retry() {
    if (!planId) return;
    setError("");
    setSubmitting(true);
    try {
      await retryFailedPlan({ planId });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The plan couldn't be retried. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const units = unitPreference ?? "metric";
  const heightLabel = units === "metric" ? "Height (cm)" : "Height (inches)";
  const weightLabel = units === "metric" ? "Weight (kg)" : "Weight (lb)";

  return (
    <section className="container mx-auto max-w-3xl px-4 py-16">
      <Card className="border-border bg-card/90 p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Build your fitness plan</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Available to adults 18 and older. Your measurements are converted
              and stored in centimeters and kilograms.
            </p>
          </div>
          <Link className="text-sm text-primary underline" href="/generate-program">
            Use voice instead
          </Link>
        </div>

        {!planId && unitPreference === undefined ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading your unit preference...
          </p>
        ) : !planId ? (
          <form onSubmit={submitForm} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              Age
              <input
                required
                min="18"
                max="100"
                type="number"
                name="age"
                className="rounded border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-2 text-sm">
              {heightLabel}
              <input
                required
                min={units === "metric" ? "100" : "40"}
                max={units === "metric" ? "250" : "98"}
                step="any"
                type="number"
                name="height"
                className="rounded border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-2 text-sm">
              {weightLabel}
              <input
                required
                min={units === "metric" ? "30" : "67"}
                max={units === "metric" ? "350" : "772"}
                step="any"
                type="number"
                name="weight"
                className="rounded border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-2 text-sm">
              Fitness goal
              <input
                required
                maxLength={120}
                name="goal"
                placeholder="Build strength, improve endurance..."
                className="rounded border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-2 text-sm">
              Experience level
              <select
                name="level"
                required
                defaultValue="beginner"
                className="rounded border border-border bg-background px-3 py-2"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              Days per week
              <input
                required
                min="1"
                max="7"
                type="number"
                name="daysPerWeek"
                defaultValue="3"
                className="rounded border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-2 text-sm sm:col-span-2">
              Equipment available
              <input
                name="equipment"
                placeholder="Dumbbells, resistance bands (comma separated)"
                className="rounded border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-2 text-sm sm:col-span-2">
              Injuries or limitations
              <textarea
                name="injuries"
                rows={2}
                className="rounded border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-2 text-sm sm:col-span-2">
              Dietary restrictions
              <textarea
                name="dietaryRestrictions"
                rows={2}
                className="rounded border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="flex items-start gap-3 text-sm sm:col-span-2">
              <input
                required
                type="checkbox"
                checked={medicalDisclaimerAccepted}
                onChange={(event) =>
                  setMedicalDisclaimerAccepted(event.currentTarget.checked)
                }
                className="mt-1 size-4 accent-primary"
              />
              <span>
                I understand this plan is educational and not medical advice. I
                will consult a qualified healthcare professional before changing
                my exercise or diet, especially if I have a health concern.
              </span>
            </label>

            {error && (
              <p role="alert" className="text-sm text-destructive sm:col-span-2">
                {error}
              </p>
            )}
            <Button disabled={submitting} type="submit" className="sm:col-span-2">
              {submitting ? "Queueing plan..." : "Generate my plan"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4" aria-live="polite">
            {plan?.status === "pending" && (
              <p role="status">Your plan is generating. This page will update automatically.</p>
            )}
            {plan?.status === "failed" && (
              <>
                <p role="alert" className="text-destructive">
                  {plan.failureReason ?? "Your plan could not be generated."}
                </p>
                <Button disabled={submitting} onClick={retry}>
                  Retry generation
                </Button>
              </>
            )}
            {plan?.status === "ready" && (
              <p role="status">Plan ready. Opening your profile...</p>
            )}
            {!plan && <p role="status">Loading plan status...</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </Card>
    </section>
  );
}
