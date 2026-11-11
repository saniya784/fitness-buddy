"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";

type Plan = Doc<"plans">;
type WorkoutPlan = NonNullable<Plan["workoutPlan"]>;
type Routine = WorkoutPlan["exercises"][number]["routines"][number];

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {label}
      <input
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.currentTarget.value === "" ? undefined : Number(event.currentTarget.value))
        }
        className="w-full rounded border border-border bg-background px-2 py-1 text-foreground"
      />
    </label>
  );
}

export default function PlanManagement({ plan }: { plan: Plan }) {
  const setActive = useMutation(api.plans.setPlanActive);
  const editPlan = useMutation(api.plans.editPlan);
  const duplicatePlan = useMutation(api.plans.duplicatePlan);
  const regeneratePlan = useMutation(api.plans.regeneratePlan);
  const beginDeletePlan = useMutation(api.plans.beginDeletePlan);
  const versions = useQuery(api.plans.getPlanVersions, { planId: plan._id });
  const [name, setName] = useState(plan.name);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | undefined>(
    plan.workoutPlan,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setName(plan.name);
    setWorkoutPlan(plan.workoutPlan);
  }, [plan._id, plan.name, plan.workoutPlan]);

  function updateRoutine(
    dayIndex: number,
    routineIndex: number,
    update: Partial<Routine>,
  ) {
    setWorkoutPlan((current) => {
      if (!current) return current;
      return {
        ...current,
        exercises: current.exercises.map((day, index) =>
          index === dayIndex
            ? {
                ...day,
                routines: day.routines.map((routine, itemIndex) =>
                  itemIndex === routineIndex
                    ? { ...routine, ...update }
                    : routine,
                ),
              }
            : day,
        ),
      };
    });
  }

  async function runOperation(operation: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      setMessage(done);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The plan could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function saveChanges() {
    if (!workoutPlan) return;
    await editPlan({ planId: plan._id, name, workoutPlan });
  }

  const canEdit = (!plan.status || plan.status === "ready") && workoutPlan;

  return (
    <section className="no-print space-y-5 rounded-lg border border-border bg-card/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Manage plan</h3>
        <p className="text-xs text-muted-foreground">
          Saved versions: {versions?.length ?? "…"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {!plan.isActive &&
          plan.workoutPlan &&
          plan.dietPlan &&
          plan.status !== "pending" &&
          plan.status !== "failed" && (
          <Button
            disabled={busy}
            onClick={() =>
              void runOperation(() => setActive({ planId: plan._id }), "Plan is now active.")
            }
          >
            Set active
          </Button>
        )}
        <Button
          variant="outline"
          disabled={busy || (plan.status !== undefined && plan.status !== "ready")}
          onClick={() =>
            void runOperation(
              () => duplicatePlan({ planId: plan._id }),
              "A copy of this plan was created.",
            )
          }
        >
          Duplicate
        </Button>
        {plan.generationInput && (
          <Button
            variant="outline"
            disabled={busy || plan.status === "pending"}
            onClick={() =>
              void runOperation(
                () => regeneratePlan({ planId: plan._id }),
                "Plan regeneration started.",
              )
            }
          >
            Regenerate
          </Button>
        )}
        <Button
          variant="destructive"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Delete "${plan.name}" and its workout history?`)) {
              void runOperation(
                () => beginDeletePlan({ planId: plan._id }),
                "Plan deletion started.",
              );
            }
          }}
        >
          Delete
        </Button>
      </div>

      {canEdit && (
        <div className="space-y-4 border-t border-border pt-4">
          <label className="grid max-w-md gap-1 text-sm">
            Plan name
            <input
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.currentTarget.value)}
              className="rounded border border-border bg-background px-3 py-2"
            />
          </label>

          {workoutPlan.exercises.map((day, dayIndex) => (
            <fieldset key={`${day.day}-${dayIndex}`} className="space-y-3 rounded border border-border p-3">
              <legend className="px-1 font-medium">{day.day}</legend>
              {day.routines.map((routine, routineIndex) => (
                <div
                  key={`${routine.name}-${routineIndex}`}
                  className="grid gap-3 border-t border-border/70 pt-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      Exercise
                      <input
                        value={routine.name}
                        maxLength={120}
                        onChange={(event) =>
                          updateRoutine(dayIndex, routineIndex, {
                            name: event.currentTarget.value,
                          })
                        }
                        className="rounded border border-border bg-background px-2 py-1 text-foreground"
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      Duration
                      <input
                        value={routine.duration ?? ""}
                        maxLength={80}
                        onChange={(event) =>
                          updateRoutine(dayIndex, routineIndex, {
                            duration: event.currentTarget.value || undefined,
                          })
                        }
                        className="rounded border border-border bg-background px-2 py-1 text-foreground"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <NumberField
                      label="Sets"
                      value={routine.sets}
                      onChange={(sets) => updateRoutine(dayIndex, routineIndex, { sets })}
                    />
                    <NumberField
                      label="Reps"
                      value={routine.reps}
                      onChange={(reps) => updateRoutine(dayIndex, routineIndex, { reps })}
                    />
                    <NumberField
                      label="Rest seconds"
                      value={routine.restSeconds}
                      onChange={(restSeconds) =>
                        updateRoutine(dayIndex, routineIndex, { restSeconds })
                      }
                    />
                  </div>
                  {(["description", "notes"] as const).map((field) => (
                    <label key={field} className="grid gap-1 text-xs capitalize text-muted-foreground">
                      {field}
                      <textarea
                        value={routine[field] ?? ""}
                        maxLength={1000}
                        onChange={(event) =>
                          updateRoutine(dayIndex, routineIndex, {
                            [field]: event.currentTarget.value || undefined,
                          })
                        }
                        className="min-h-16 rounded border border-border bg-background px-2 py-1 text-foreground"
                      />
                    </label>
                  ))}
                </div>
              ))}
            </fieldset>
          ))}

          <Button
            disabled={busy || !workoutPlan}
            onClick={() =>
              void runOperation(
                saveChanges,
                "Plan changes saved as a new version.",
              )
            }
          >
            Save changes
          </Button>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
    </section>
  );
}
