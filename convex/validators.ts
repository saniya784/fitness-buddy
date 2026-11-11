import { v } from "convex/values";

export const planStatusValidator = v.union(
  v.literal("pending"),
  v.literal("ready"),
  v.literal("failed"),
);

export const unitPreferenceValidator = v.union(
  v.literal("metric"),
  v.literal("imperial"),
);

export const generationInputValidator = v.object({
  age: v.number(),
  heightCm: v.number(),
  weightKg: v.number(),
  goal: v.string(),
  level: v.string(),
  daysPerWeek: v.number(),
  equipment: v.array(v.string()),
  injuries: v.string(),
  dietaryRestrictions: v.string(),
});

export const workoutPlanValidator = v.object({
  schedule: v.array(v.string()),
  exercises: v.array(
    v.object({
      day: v.string(),
      routines: v.array(
        v.object({
          name: v.string(),
          sets: v.optional(v.number()),
          reps: v.optional(v.number()),
          duration: v.optional(v.string()),
          description: v.optional(v.string()),
          exercises: v.optional(v.array(v.string())),
          notes: v.optional(v.string()),
          restSeconds: v.optional(v.number()),
        }),
      ),
    }),
  ),
});

export const dietPlanValidator = v.object({
  dailyCalories: v.number(),
  meals: v.array(
    v.object({
      name: v.string(),
      foods: v.array(v.string()),
    }),
  ),
});

export const MINIMUM_DAILY_CALORIES = 1200;

export function validateGenerationInput(input: {
  age: number;
  heightCm: number;
  weightKg: number;
  goal: string;
  level: string;
  daysPerWeek: number;
  equipment: string[];
  injuries: string;
  dietaryRestrictions: string;
}) {
  const safetyMessage = getGenerationSafetyMessage(input);
  if (safetyMessage) throw new Error(safetyMessage);
  if (input.age > 100) throw new Error("Age must be 100 or younger.");
  if (
    !Number.isFinite(input.heightCm) ||
    input.heightCm < 100 ||
    input.heightCm > 250
  ) {
    throw new Error("Height must be between 100 and 250 cm.");
  }
  if (
    !Number.isFinite(input.weightKg) ||
    input.weightKg < 30 ||
    input.weightKg > 350
  ) {
    throw new Error("Weight must be between 30 and 350 kg.");
  }
  if (!input.goal.trim() || input.goal.length > 120) {
    throw new Error("Enter a fitness goal of 120 characters or fewer.");
  }
  if (!["beginner", "intermediate", "advanced"].includes(input.level)) {
    throw new Error("Choose a valid fitness level.");
  }
  if (
    !Number.isInteger(input.daysPerWeek) ||
    input.daysPerWeek < 1 ||
    input.daysPerWeek > 7
  ) {
    throw new Error("Workout days must be between 1 and 7.");
  }
  if (input.equipment.length > 20) {
    throw new Error("Choose no more than 20 equipment items.");
  }
  return input;
}

export function validateDailyCalories(calories: number) {
  if (
    !Number.isFinite(calories) ||
    calories < MINIMUM_DAILY_CALORIES
  ) {
    throw new Error(
      `Generated plan is below the minimum ${MINIMUM_DAILY_CALORIES} kcal safety floor.`,
    );
  }
  return calories;
}

export function getGenerationSafetyMessage(input: {
  age: number;
  goal: string;
  injuries: string;
  dietaryRestrictions: string;
}): string | null {
  if (!Number.isFinite(input.age) || !Number.isInteger(input.age) || input.age < 18) {
    return "This plan generator is for adults. If you are under 18, please ask a parent or guardian to help you speak with a qualified healthcare professional or dietitian.";
  }

  const disclosedNeeds = [
    input.goal,
    input.injuries,
    input.dietaryRestrictions,
  ].join(" ");
  if (/\b(pregnan(?:t|cy)|expecting a baby)\b/i.test(disclosedNeeds)) {
    return "We can't safely create a plan for pregnancy. Please consult your obstetrician or a registered dietitian for individualized exercise and nutrition advice.";
  }

  if (
    /\b(eating disorder|disordered eating|anorexia|anorexic|bulimia|bulimic|binge eating|purging|purge|starving myself|restrictive eating)\b/i.test(
      disclosedNeeds,
    )
  ) {
    return "We can't safely create a plan for this concern. Please talk with a qualified healthcare professional or eating-disorder specialist for individualized support.";
  }

  return null;
}
