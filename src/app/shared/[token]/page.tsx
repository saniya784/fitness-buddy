"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";

export default function SharedPlanPage() {
  const { token } = useParams<{ token: string }>();
  const plan = useQuery(api.plans.getSharedPlan, { token });

  if (plan === undefined) {
    return <p role="status" className="container mx-auto px-4 py-12">Loading shared plan…</p>;
  }
  if (!plan) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold">Share link unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          This plan may have been removed or its owner revoked the link.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-primary">Read-only shared plan</p>
          <h1 className="mt-2 text-3xl font-bold">Workout and nutrition plan</h1>
        </div>
        <Button className="no-print" variant="outline" onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </div>
      <aside className="rounded border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-muted-foreground">
        {plan.safetyFootnote}
      </aside>
      <section className="space-y-5">
        <h2 className="text-xl font-semibold">Workout schedule</h2>
        <p className="text-sm text-muted-foreground">{plan.workoutPlan.schedule.join(", ")}</p>
        {plan.workoutPlan.exercises.map((day, dayIndex) => (
          <article key={`${day.day}-${dayIndex}`} className="rounded border border-border p-4">
            <h3 className="mb-3 font-semibold">{day.day}</h3>
            <ul className="space-y-3">
              {day.routines.map((routine, index) => (
                <li key={`${routine.name}-${index}`} className="border-t border-border pt-3">
                  <p className="font-medium">{routine.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {routine.duration ??
                      (routine.sets !== undefined && routine.reps !== undefined
                        ? `${routine.sets} sets × ${routine.reps} reps`
                        : "Follow the exercise instructions")}
                    {routine.restSeconds !== undefined
                      ? ` · ${routine.restSeconds}s rest`
                      : ""}
                  </p>
                  {routine.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{routine.description}</p>
                  )}
                  {routine.notes && (
                    <p className="mt-1 text-sm text-muted-foreground">{routine.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Nutrition plan</h2>
        <p className="text-sm text-muted-foreground">
          Daily target: {plan.dietPlan.dailyCalories} kcal
        </p>
        {plan.dietPlan.meals.map((meal, index) => (
          <article key={`${meal.name}-${index}`} className="rounded border border-border p-4">
            <h3 className="font-semibold">{meal.name}</h3>
            <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
              {meal.foods.map((food, foodIndex) => <li key={`${food}-${foodIndex}`}>{food}</li>)}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
