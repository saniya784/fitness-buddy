"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import ProfileHeader from "@/components/ProfileHeader";
import NoFitnessPlan from "@/components/NoFitnessPlan";
import CornerElements from "@/components/CornerElements";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppleIcon, CalendarIcon, DumbbellIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { formatHeight, formatWeight } from "@/lib/units";
import { MEDICAL_DISCLAIMER } from "@/constants";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PlanManagement from "@/components/PlanManagement";
import WorkoutTracker from "@/components/WorkoutTracker";
import ProgressTracker from "@/components/ProgressTracker";
import ReminderSettings from "@/components/ReminderSettings";
import PlanSharing from "@/components/PlanSharing";

const ProfilePage = () => {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const allPlans = useQuery(
    api.plans.getUserPlans,
    isLoaded && userId ? { userId } : "skip"
  );
  const unitPreference = useQuery(
    api.users.getUnitPreference,
    isLoaded && userId ? {} : "skip",
  );
  const setUnitPreference = useMutation(api.plans.setUnitPreference);
  const [selectedPlanId, setSelectedPlanId] = useState<null | string>(null);
  const [unitPreferenceError, setUnitPreferenceError] = useState("");

  const activePlan = allPlans?.find(
    (plan) => plan.isActive && (!plan.status || plan.status === "ready"),
  );
  const selectedPlan = selectedPlanId
    ? allPlans?.find((plan) => plan._id === selectedPlanId)
    : undefined;
  const displayPlan = selectedPlan ?? activePlan ?? allPlans?.[0];

  const currentPlan =
    displayPlan && (!displayPlan.status || displayPlan.status === "ready")
      ? displayPlan
      : undefined;

  return (
    <section className="relative z-10 pt-12 pb-32 flex-grow container mx-auto px-4">
      <ProfileHeader user={user} />

      <div className="mb-8 flex flex-wrap items-center gap-3 border border-border bg-card/70 p-4">
        <label htmlFor="unit-preference" className="font-mono text-sm text-muted-foreground">
          DISPLAY UNITS
        </label>
        <select
          id="unit-preference"
          value={unitPreference ?? "metric"}
          onChange={async (event) => {
            setUnitPreferenceError("");
            try {
              await setUnitPreference({
                preference: event.currentTarget.value as "metric" | "imperial",
              });
            } catch (error) {
              setUnitPreferenceError(
                error instanceof Error ? error.message : "Could not update unit preference.",
              );
            }
          }}
          className="rounded border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="metric">Metric (cm, kg)</option>
          <option value="imperial">Imperial (ft/in, lb)</option>
        </select>
        {unitPreferenceError && (
          <p role="alert" className="text-sm text-destructive">
            {unitPreferenceError}
          </p>
        )}
      </div>

      {isLoaded && userId && (
        <div className="mb-8">
          <ProgressTracker units={unitPreference ?? "metric"} />
        </div>
      )}

      {allPlans && allPlans?.length > 0 ? (
        <div className="space-y-8">
          {/* PLAN SELECTOR */}
          <div className="relative backdrop-blur-sm border border-border p-6">
            <CornerElements />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-tight">
                <span className="text-primary">Your</span>{" "}
                <span className="text-foreground">Fitness Plans</span>
              </h2>
              <div className="font-mono text-xs text-muted-foreground">
                TOTAL: {allPlans.length}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {allPlans.map((plan) => (
                <Button
                  key={plan._id}
                  onClick={() => setSelectedPlanId(plan._id)}
                  className={`text-foreground border hover:text-white ${
                    selectedPlanId === plan._id
                      ? "bg-primary/20 text-primary border-primary"
                      : "bg-transparent border-border hover:border-primary/50"
                  }`}
                >
                  {plan.name}
                  <span
                    className={`ml-2 px-2 py-0.5 rounded text-xs ${
                      plan.status === "failed"
                        ? "bg-destructive/20 text-destructive"
                        : plan.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-600"
                          : plan.isActive
                            ? "bg-green-500/20 text-green-500"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {plan.status === "pending"
                      ? "GENERATING"
                      : plan.status === "failed"
                        ? "FAILED"
                        : plan.isActive
                          ? "ACTIVE"
                          : "READY"}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {displayPlan?.status === "pending" && (
            <p role="status" className="border border-border bg-card/70 p-4 text-muted-foreground">
              Your {displayPlan.name.toLowerCase()} is still generating.
            </p>
          )}
          {displayPlan?.status === "failed" && (
            <p role="alert" className="border border-destructive/40 bg-destructive/10 p-4 text-destructive">
              {displayPlan.failureReason ?? "This plan could not be generated."}
            </p>
          )}

          {/* PLAN DETAILS */}

          {currentPlan?.workoutPlan && currentPlan.dietPlan && (
            <div className="relative backdrop-blur-sm border border-border rounded-lg p-6">
              <CornerElements />

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <h3 className="text-lg font-bold">
                    PLAN: <span className="text-primary">{currentPlan.name}</span>
                  </h3>
                </div>
                <Button
                  className="no-print"
                  variant="outline"
                  onClick={() => window.print()}
                >
                  Print / Save as PDF
                </Button>
              </div>

              <aside className="mb-5 rounded border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-muted-foreground">
                <strong className="text-foreground">Health and safety:</strong>{" "}
                {MEDICAL_DISCLAIMER}
              </aside>

              {(currentPlan.heightCm !== undefined ||
                currentPlan.weightKg !== undefined) && (
                <div className="mb-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {currentPlan.heightCm !== undefined && (
                    <span>Height: {formatHeight(currentPlan.heightCm, unitPreference ?? "metric")}</span>
                  )}
                  {currentPlan.weightKg !== undefined && (
                    <span>Weight: {formatWeight(currentPlan.weightKg, unitPreference ?? "metric")}</span>
                  )}
                </div>
              )}

              <Tabs defaultValue="workout" className="w-full">
                <TabsList className="mb-6 w-full grid grid-cols-2 bg-cyber-terminal-bg border">
                  <TabsTrigger
                    value="workout"
                    className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                  >
                    <DumbbellIcon className="mr-2 size-4" />
                    Workout Plan
                  </TabsTrigger>

                  <TabsTrigger
                    value="diet"
                    className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                  >
                    <AppleIcon className="mr-2 h-4 w-4" />
                    Diet Plan
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="workout">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <span className="font-mono text-sm text-muted-foreground">
                        SCHEDULE: {currentPlan.workoutPlan.schedule.join(", ")}
                      </span>
                    </div>

                    <Accordion type="multiple" className="space-y-4">
                      {currentPlan.workoutPlan.exercises.map((exerciseDay, index) => (
                        <AccordionItem
                          key={index}
                          value={exerciseDay.day}
                          className="border rounded-lg overflow-hidden"
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-primary/10 font-mono">
                            <div className="flex justify-between w-full items-center">
                              <span className="text-primary">{exerciseDay.day}</span>
                              <div className="text-xs text-muted-foreground">
                                {exerciseDay.routines.length} EXERCISES
                              </div>
                            </div>
                          </AccordionTrigger>

                          <AccordionContent className="pb-4 px-4">
                            <div className="space-y-3 mt-2">
                              {exerciseDay.routines.map((routine, routineIndex) => (
                                <div
                                  key={routineIndex}
                                  className="border border-border rounded p-3 bg-background/50"
                                >
                                  <div className="flex justify-between items-start gap-3 mb-2">
                                    <h4 className="font-semibold text-foreground">
                                      {routine.name}
                                    </h4>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                      {routine.duration && (
                                        <div className="px-2 py-1 rounded bg-secondary/20 text-secondary text-xs font-mono">
                                          {routine.duration}
                                        </div>
                                      )}
                                      {routine.sets !== undefined && routine.reps !== undefined && (
                                        <>
                                          <div className="px-2 py-1 rounded bg-primary/20 text-primary text-xs font-mono">
                                            {routine.sets} SETS
                                          </div>
                                          <div className="px-2 py-1 rounded bg-secondary/20 text-secondary text-xs font-mono">
                                            {routine.reps} REPS
                                          </div>
                                        </>
                                      )}
                                      {routine.restSeconds !== undefined && (
                                        <div className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-mono">
                                          {routine.restSeconds}s REST
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {routine.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {routine.description}
                                    </p>
                                  )}
                                  {routine.notes && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Notes: {routine.notes}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </TabsContent>

                <TabsContent value="diet">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-mono text-sm text-muted-foreground">
                        DAILY CALORIE TARGET
                      </span>
                      <div className="font-mono text-xl text-primary">
                        {currentPlan.dietPlan.dailyCalories} KCAL
                      </div>
                    </div>

                    <div className="h-px w-full bg-border my-4"></div>

                    <div className="space-y-4">
                      {currentPlan.dietPlan.meals.map((meal, index) => (
                        <div
                          key={index}
                          className="border border-border rounded-lg overflow-hidden p-4"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            <h4 className="font-mono text-primary">{meal.name}</h4>
                          </div>
                          <ul className="space-y-2">
                            {meal.foods.map((food, foodIndex) => (
                              <li
                                key={foodIndex}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                              >
                                <span className="text-xs text-primary font-mono">
                                  {String(foodIndex + 1).padStart(2, "0")}
                                </span>
                                {food}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {displayPlan && <PlanManagement key={displayPlan._id} plan={displayPlan} />}
          {currentPlan && (
            <>
              <WorkoutTracker
                key={`workout-${currentPlan._id}`}
                plan={currentPlan}
                units={unitPreference ?? "metric"}
              />
              <PlanSharing key={`sharing-${currentPlan._id}`} plan={currentPlan} />
              {currentPlan.isActive && (
                <ReminderSettings
                  key={`reminders-${currentPlan._id}`}
                  plan={currentPlan}
                />
              )}
            </>
          )}
        </div>
      ) : allPlans === undefined || !isLoaded ? (
        <p role="status" className="text-center text-muted-foreground">
          Loading your plans...
        </p>
      ) : (
        <NoFitnessPlan />
      )}
    </section>
  );
};
export default ProfilePage;
