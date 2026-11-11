import { GoogleGenerativeAI } from "@google/generative-ai";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  MINIMUM_DAILY_CALORIES,
  generationInputValidator,
  validateDailyCalories,
} from "./validators";

type GenerationInput = {
  age: number;
  heightCm: number;
  weightKg: number;
  goal: string;
  level: string;
  daysPerWeek: number;
  equipment: string[];
  injuries: string;
  dietaryRestrictions: string;
};
const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The generated response was not an object.");
  }
  return value as Record<string, unknown>;
}

function parseJson(text: string): unknown {
  const normalized = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(normalized) as unknown;
}

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Generated response is missing ${field}.`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function nonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function parseWorkoutPlan(value: unknown, expectedDaysPerWeek: number) {
  const plan = asRecord(value);
  if (!Array.isArray(plan.schedule) || !Array.isArray(plan.exercises)) {
    throw new Error("Generated workout plan is missing its schedule.");
  }
  const schedule = plan.schedule.map((day) =>
    nonEmptyString(day, "a schedule day"),
  );
  if (
    schedule.length !== expectedDaysPerWeek ||
    new Set(schedule).size !== schedule.length ||
    schedule.some((day) => !WEEKDAYS.includes(day))
  ) {
    throw new Error("Generated workout schedule must use the selected number of unique weekdays.");
  }

  const exerciseDays = new Set<string>();
  const exercises = plan.exercises.map((dayValue) => {
    const day = asRecord(dayValue);
    const dayName = nonEmptyString(day.day, "a workout day");
    if (!schedule.includes(dayName) || exerciseDays.has(dayName)) {
      throw new Error("Each workout group must match one unique scheduled weekday.");
    }
    if (!Array.isArray(day.routines) || day.routines.length === 0) {
      throw new Error("Generated workout day is missing its exercises.");
    }
    exerciseDays.add(dayName);

    return {
      day: dayName,
      routines: day.routines.map((routineValue) => {
        const routine = asRecord(routineValue);
        const sets = positiveNumber(routine.sets);
        const reps = positiveNumber(routine.reps);
        const duration = optionalString(routine.duration);
        const name = nonEmptyString(routine.name, "an exercise name");
        const description = optionalString(routine.description);
        const notes = optionalString(routine.notes);
        const restSeconds = nonNegativeNumber(routine.restSeconds);

        if (duration) {
          return {
            name,
            duration,
            ...(description ? { description } : {}),
            ...(notes ? { notes } : {}),
            ...(restSeconds !== undefined ? { restSeconds } : {}),
          };
        }
        if (!sets || !reps) {
          throw new Error("Each strength exercise needs sets and reps.");
        }
        return {
          name,
          sets,
          reps,
          ...(description ? { description } : {}),
          ...(notes ? { notes } : {}),
          ...(restSeconds !== undefined ? { restSeconds } : {}),
        };
      }),
    };
  });
  if (exerciseDays.size !== schedule.length) {
    throw new Error("Generated workout groups do not cover each scheduled day.");
  }

  return {
    schedule,
    exercises,
  };
}

function parseDietPlan(value: unknown) {
  const plan = asRecord(value);
  if (!Array.isArray(plan.meals)) {
    throw new Error("Generated diet plan is missing meals.");
  }

  if (typeof plan.dailyCalories !== "number") {
    throw new Error("Generated diet plan is missing daily calories.");
  }
  validateDailyCalories(plan.dailyCalories);

  return {
    dailyCalories: plan.dailyCalories,
    meals: plan.meals.map((mealValue) => {
      const meal = asRecord(mealValue);
      if (!Array.isArray(meal.foods) || !meal.foods.every((food) => typeof food === "string")) {
        throw new Error("Generated diet meal has invalid foods.");
      }
      return {
        name: nonEmptyString(meal.name, "a meal name"),
        foods: meal.foods,
      };
    }),
  };
}

function buildPrompts(input: GenerationInput) {
  const profile = `Age: ${input.age} years
Height: ${input.heightCm} cm (centimeters)
Weight: ${input.weightKg} kg (kilograms)
Goal: ${input.goal}
Experience: ${input.level}
Workout days per week: ${input.daysPerWeek}
Available equipment: ${input.equipment.join(", ") || "bodyweight"}
Injuries or limitations: ${input.injuries || "none"}
Dietary restrictions: ${input.dietaryRestrictions || "none"}`;

  return {
    workout: `Create a safe, personalized workout plan for this profile:
${profile}

Use metric units wherever a distance or load is mentioned. Account for injuries and available equipment. Provide a schedule with exactly ${input.daysPerWeek} unique training weekdays chosen from Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, and Sunday. Use those exact weekday names in schedule and as the matching exercise group day labels. Strength exercises must include numeric sets and reps. Timed/cardio exercises must use a duration such as "20 minutes" and must NOT use placeholder sets or reps. Include optional description, notes, and restSeconds only when useful.
Return only JSON with exactly this shape:
{"schedule":["Monday"],"exercises":[{"day":"Monday","routines":[{"name":"Squat","sets":3,"reps":10,"description":"...","notes":"...","restSeconds":90},{"name":"Easy cycling","duration":"20 minutes","description":"..."}]}]}
Each exercise must have either both sets and reps, or duration. Never invent sets: 1 / reps: 1 for cardio.`,
    diet: `Create a personalized diet plan for this profile:
${profile}

Use height in centimeters and weight in kilograms for all calculations. Respect dietary restrictions and support the stated goal. Never set dailyCalories below ${MINIMUM_DAILY_CALORIES} kcal. Return only JSON with exactly this shape:
{"dailyCalories":2000,"meals":[{"name":"Breakfast","foods":["Oats","Berries"]}]}`,
  };
}

export const generateFromForm = action({
  args: {
    input: generationInputValidator,
    medicalDisclaimerAccepted: v.boolean(),
  },
  handler: async (
    ctx,
    { input, medicalDisclaimerAccepted },
  ): Promise<Id<"plans">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to generate a fitness plan.");
    if (!medicalDisclaimerAccepted) {
      throw new Error("Accept the medical disclaimer before generating a plan.");
    }

    await ctx.runMutation(internal.users.recordMedicalDisclaimer, {
      userId: identity.subject,
    });

    const planId: Id<"plans"> = await ctx.runMutation(
      internal.plans.createPendingPlan,
      {
        userId: identity.subject,
        input,
      },
    );
    return planId;
  },
});

export const generatePlan = internalAction({
  args: {
    planId: v.id("plans"),
    attempt: v.number(),
  },
  handler: async (ctx, { planId, attempt }) => {
    try {
      const data = await ctx.runQuery(internal.plans.getGenerationInput, {
        planId,
      });
      if (!data) return;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

      const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          responseMimeType: "application/json",
        },
      });
      const prompts = buildPrompts(data.input);
      const [workoutResult, dietResult] = await Promise.all([
        model.generateContent(prompts.workout),
        model.generateContent(prompts.diet),
      ]);

      const workoutPlan = parseWorkoutPlan(
        parseJson(workoutResult.response.text()),
        data.input.daysPerWeek,
      );
      const dietPlan = parseDietPlan(parseJson(dietResult.response.text()));

      await ctx.runMutation(internal.plans.markPlanReady, {
        planId,
        workoutPlan,
        dietPlan,
      });
    } catch (error) {
      console.error("Plan generation attempt failed.", error);
      await ctx.runMutation(internal.plans.retryOrFailPlan, {
        planId,
        attempt,
      });
    }
  },
});