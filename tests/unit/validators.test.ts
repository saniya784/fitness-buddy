import { describe, expect, it } from "vitest";
import {
  MINIMUM_DAILY_CALORIES,
  dietPlanValidator,
  generationInputValidator,
  getGenerationSafetyMessage,
  planStatusValidator,
  validateDailyCalories,
  validateGenerationInput,
  workoutPlanValidator,
} from "../../convex/validators";

const validInput = {
  age: 35,
  heightCm: 175,
  weightKg: 75,
  goal: "Build strength",
  level: "beginner",
  daysPerWeek: 3,
  equipment: ["dumbbells"],
  injuries: "none",
  dietaryRestrictions: "none",
};

describe("Convex plan validators", () => {
  it("defines status and generation input as explicit object validators", () => {
    expect(planStatusValidator.kind).toBe("union");
    expect(generationInputValidator.kind).toBe("object");
    expect(Object.keys(generationInputValidator.fields)).toEqual(
      expect.arrayContaining([
        "age",
        "heightCm",
        "weightKg",
        "daysPerWeek",
        "equipment",
      ]),
    );
  });

  it("allows optional descriptions and timed routines without requiring sets or reps", () => {
    expect(workoutPlanValidator.kind).toBe("object");
    const exercises = workoutPlanValidator.fields.exercises;
    expect(exercises.kind).toBe("array");
    const routine = exercises.element.fields.routines;
    expect(routine.kind).toBe("array");
    const routineFields = routine.element.fields;
    expect(routineFields.duration.isOptional).toBe("optional");
    expect(routineFields.description.isOptional).toBe("optional");
    expect(routineFields.sets.isOptional).toBe("optional");
    expect(routineFields.reps.isOptional).toBe("optional");
  });

  it("keeps the calorie floor in place for generated meal plans", () => {
    expect(dietPlanValidator.kind).toBe("object");
    expect(validateDailyCalories(MINIMUM_DAILY_CALORIES)).toBe(
      MINIMUM_DAILY_CALORIES,
    );
    expect(() => validateDailyCalories(MINIMUM_DAILY_CALORIES - 1)).toThrow(
      /minimum 1200 kcal safety floor/,
    );
    expect(() => validateDailyCalories(Number.NaN)).toThrow();
  });

  it("accepts a valid adult generation profile and rejects invalid ranges", () => {
    expect(validateGenerationInput(validInput)).toEqual(validInput);
    expect(() =>
      validateGenerationInput({ ...validInput, heightCm: 99 }),
    ).toThrow(/Height must be between/);
    expect(() =>
      validateGenerationInput({ ...validInput, daysPerWeek: 3.5 }),
    ).toThrow(/Workout days must be between/);
  });

  it.each([
    [{ ...validInput, age: 17 }, /adults/],
    [{ ...validInput, goal: "Pregnancy weight loss" }, /pregnancy/],
    [{ ...validInput, dietaryRestrictions: "I have an eating disorder" }, /professional/],
  ])("blocks unsafe generation disclosures", (input, message) => {
    expect(getGenerationSafetyMessage(input)).toMatch(message);
    expect(() => validateGenerationInput(input)).toThrow(message);
  });

  it("allows an ordinary eligible adult profile", () => {
    expect(getGenerationSafetyMessage(validInput)).toBeNull();
  });
});
