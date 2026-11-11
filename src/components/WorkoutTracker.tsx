"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { weightToKilograms, type UnitPreference } from "@/lib/units";

type Plan = Doc<"plans">;
type Day = NonNullable<Plan["workoutPlan"]>["exercises"][number];

export default function WorkoutTracker({
  plan,
  units,
}: {
  plan: Plan;
  units: UnitPreference;
}) {
  const logWorkout = useMutation(api.plans.logWorkout);
  const history = useQuery(api.plans.getWorkoutHistory, { planId: plan._id });
  const days = plan.workoutPlan?.exercises ?? [];
  const [selectedDay, setSelectedDay] = useState(days[0]?.day ?? "");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [reps, setReps] = useState<Record<string, string>>({});
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const day: Day | undefined = days.find((item) => item.day === selectedDay);

  if (!plan.workoutPlan || !days.length) return null;

  async function saveWorkout() {
    if (!day) return;
    const hasCompletedSet = day.routines.some((routine, routineIndex) => {
      const isTimed =
        routine.duration !== undefined &&
        routine.sets === undefined &&
        routine.reps === undefined;
      if (isTimed) return checked[`${routineIndex}-timed`] === true;
      return Array.from({ length: routine.sets ?? 1 }, (_, setIndex) =>
        checked[`${routineIndex}-${setIndex}`],
      ).some(Boolean);
    });
    if (!hasCompletedSet) {
      setError("Check off at least one completed set before saving.");
      return;
    }

    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await logWorkout({
        planId: plan._id,
        day: day.day,
        submissionId: crypto.randomUUID(),
        exercises: day.routines.map((routine, routineIndex) => {
          const isTimed =
            routine.duration !== undefined &&
            routine.sets === undefined &&
            routine.reps === undefined;
          if (isTimed) {
            return {
              name: routine.name,
              sets: [],
              completed: checked[`${routineIndex}-timed`] === true,
              duration: routine.duration,
            };
          }
          return {
            name: routine.name,
            sets: Array.from({ length: routine.sets ?? 1 }, (_, setIndex) => {
              const key = `${routineIndex}-${setIndex}`;
              const actualReps = reps[key] === "" ? undefined : Number(reps[key]);
              const enteredWeight = weights[key] === "" ? undefined : Number(weights[key]);
              const weightKg =
                enteredWeight !== undefined && Number.isFinite(enteredWeight)
                  ? weightToKilograms(enteredWeight, units)
                  : undefined;
              return {
                ...(routine.reps !== undefined ? { targetReps: routine.reps } : {}),
                completed: checked[key] === true,
                ...(actualReps !== undefined && Number.isFinite(actualReps)
                  ? { reps: actualReps }
                  : {}),
                ...(weightKg !== undefined && Number.isFinite(weightKg)
                  ? { weightKg }
                  : {}),
              };
            }),
          };
        }),
      });
      setSaved(true);
      setChecked({});
      setReps({});
      setWeights({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workout could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="no-print space-y-5 rounded-lg border border-border bg-card/60 p-5">
      <div>
        <h3 className="text-lg font-semibold">Log a workout</h3>
        <p className="text-sm text-muted-foreground">
          Mark completed sets and record actual reps and weight if useful.
        </p>
      </div>
      <label className="grid max-w-xs gap-1 text-sm">
        Workout day
        <select
          value={selectedDay}
          onChange={(event) => setSelectedDay(event.currentTarget.value)}
          className="rounded border border-border bg-background px-3 py-2"
        >
          {days.map((item) => (
            <option key={item.day} value={item.day}>{item.day}</option>
          ))}
        </select>
      </label>

      {day?.routines.map((routine, routineIndex) => {
        const isTimed =
          routine.duration !== undefined &&
          routine.sets === undefined &&
          routine.reps === undefined;
        return (
        <fieldset key={`${routine.name}-${routineIndex}`} className="space-y-2 rounded border border-border p-3">
          <legend className="px-1 font-medium">{routine.name}</legend>
          {isTimed ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checked[`${routineIndex}-timed`] ?? false}
                onChange={(event) => {
                  const value = event.currentTarget.checked;
                  setChecked((current) => ({
                    ...current,
                    [`${routineIndex}-timed`]: value,
                  }));
                }}
              />
              Mark timed activity complete
            </label>
          ) : Array.from({ length: routine.sets ?? 1 }, (_, setIndex) => {
            const key = `${routineIndex}-${setIndex}`;
            return (
              <div key={key} className="grid grid-cols-[auto_1fr_1fr_1fr] items-end gap-2">
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked[key] ?? false}
                    onChange={(event) => {
                      const value = event.currentTarget.checked;
                      setChecked((current) => ({
                        ...current,
                        [key]: value,
                      }));
                    }}
                  />
                  Set {setIndex + 1}
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Actual reps
                  <input
                    type="number"
                    min={0}
                    value={reps[key] ?? ""}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setReps((current) => ({ ...current, [key]: value }));
                    }}
                    className="min-w-0 rounded border border-border bg-background px-2 py-1 text-foreground"
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Weight ({units === "metric" ? "kg" : "lb"})
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={weights[key] ?? ""}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setWeights((current) => ({ ...current, [key]: value }));
                    }}
                    className="min-w-0 rounded border border-border bg-background px-2 py-1 text-foreground"
                  />
                </label>
                {routine.reps !== undefined && (
                  <p className="pb-2 text-xs text-muted-foreground">
                    Target: {routine.reps} reps
                  </p>
                )}
              </div>
            );
          })}
          {routine.duration && (
            <p className="text-xs text-muted-foreground">Timed exercise: {routine.duration}</p>
          )}
        </fieldset>
        );
      })}

      <Button disabled={busy || !day} onClick={() => void saveWorkout()}>
        {busy ? "Saving…" : "Save workout"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {saved && <p role="status" className="text-sm text-primary">Workout saved.</p>}

      <div className="border-t border-border pt-4">
        <h4 className="mb-2 font-semibold">Recent workout history</h4>
        {!history?.length ? (
          <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {history.slice(0, 10).map((entry) => {
              const completedExercises = entry.exercises.filter(
                (exercise) =>
                  exercise.sets.some((set) => set.completed) ||
                  exercise.completed === true,
              ).length;
              return (
                <li key={entry._id} className="flex flex-wrap justify-between gap-3">
                  <span>{entry.day} · {completedExercises} exercises completed</span>
                  <time dateTime={new Date(entry.completedAt).toISOString()}>
                    {new Date(entry.completedAt).toLocaleString()}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
