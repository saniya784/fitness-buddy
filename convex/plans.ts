import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  dietPlanValidator,
  generationInputValidator,
  validateGenerationInput,
  unitPreferenceValidator,
  workoutPlanValidator,
} from "./validators";
import { isRateLimited } from "./rateLimit";

const GENERATION_INTERVAL_MS = 60_000;
const RELATED_DELETE_BATCH_SIZE = 40;

type MeasurementRecord = Doc<"measurementHistory"> & {
  date: string;
  recordedAt: number;
  weightKg: number;
  waistCm?: number;
  hipCm?: number;
  chestCm?: number;
};

type WorkoutHistoryRecord = Doc<"workoutLogs"> & {
  day: string;
  completedAt: number;
  exercises: Array<{
    completed?: boolean;
    sets: Array<{ completed: boolean }>;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMeasurementRecord(value: unknown): value is MeasurementRecord {
  return (
    isRecord(value) &&
    typeof value._id === "string" &&
    typeof value._creationTime === "number" &&
    typeof value.date === "string" &&
    typeof value.recordedAt === "number" &&
    Number.isFinite(value.recordedAt) &&
    typeof value.weightKg === "number" &&
    Number.isFinite(value.weightKg)
  );
}

function isWorkoutHistoryRecord(value: unknown): value is WorkoutHistoryRecord {
  return (
    isRecord(value) &&
    typeof value._id === "string" &&
    typeof value._creationTime === "number" &&
    typeof value.day === "string" &&
    typeof value.completedAt === "number" &&
    Number.isFinite(value.completedAt) &&
    Array.isArray(value.exercises) &&
    value.exercises.every(
      (exercise) =>
        isRecord(exercise) &&
        Array.isArray(exercise.sets) &&
        exercise.sets.every(
          (set) => isRecord(set) && typeof set.completed === "boolean",
        ) &&
        (exercise.completed === undefined ||
          typeof exercise.completed === "boolean"),
    )
  );
}

async function savePlanVersion(ctx: MutationCtx, plan: Doc<"plans">) {
  const latest = await ctx.db
    .query("planVersions")
    .withIndex("by_plan_version", (q) => q.eq("planId", plan._id))
    .order("desc")
    .first();
  const versionNumber =
    typeof latest?.versionNumber === "number" ? latest.versionNumber + 1 : 1;

  await ctx.db.insert("planVersions", {
    userId: plan.userId,
    planId: plan._id,
    versionNumber,
    name: plan.name,
    isActive: plan.isActive,
    createdAt: Date.now(),
    ...(plan.workoutPlan ? { workoutPlan: plan.workoutPlan } : {}),
    ...(plan.dietPlan ? { dietPlan: plan.dietPlan } : {}),
  });
}

async function getOwnedPlan(
  ctx: MutationCtx,
  planId: Doc<"plans">["_id"],
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Sign in to manage your plans.");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
  if (!user || user.deletingAt) {
    throw new Error("Your account is unavailable for plan changes.");
  }

  const plan = await ctx.db.get(planId);
  if (!plan || plan.userId !== identity.subject || plan.deletingAt) {
    throw new Error("Plan not found or access denied.");
  }
  return plan;
}

async function reserveGeneration(ctx: MutationCtx, userId: string) {
  const latestRequest = await ctx.db
    .query("generationRateLimits")
    .withIndex("by_user", (q) =>
      q.eq("userId", userId).eq("generationType", "plan"),
    )
    .order("desc")
    .first();

  if (
    isRateLimited(
      latestRequest?._creationTime,
      Date.now(),
      GENERATION_INTERVAL_MS,
    )
  ) {
    throw new Error("Please wait one minute before generating another plan.");
  }

  await ctx.db.insert("generationRateLimits", {
    userId,
    generationType: "plan",
    createdAt: Date.now(),
  });
}

export const createPendingPlan = internalMutation({
  args: {
    userId: v.string(),
    input: generationInputValidator,
    requestId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, input, requestId }) => {
    validateGenerationInput(input);
    if (requestId !== undefined && (requestId.length < 1 || requestId.length > 100)) {
      throw new Error("Invalid generation request ID.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
      .first();
    if (user?.deletingAt) {
      throw new Error("Account deletion is in progress.");
    }
    if (!user?.medicalDisclaimerAcceptedAt) {
      throw new Error("Accept the medical disclaimer before generating a plan.");
    }

    if (requestId) {
      const voiceRequest = await ctx.db
        .query("generationSessions")
        .withIndex("by_request_id", (q) => q.eq("requestId", requestId))
        .first();
      if (
        !voiceRequest ||
        voiceRequest.userId !== userId ||
        voiceRequest.consumed !== false ||
        typeof voiceRequest.startedAt !== "number" ||
        Date.now() - voiceRequest.startedAt > 10 * 60_000
      ) {
        throw new Error("This voice generation request is invalid or expired.");
      }
      await ctx.db.patch(voiceRequest._id, { consumed: true });
    } else {
      await reserveGeneration(ctx, userId);
    }

    const planId = await ctx.db.insert("plans", {
      userId,
      name: `${input.goal.trim()} Plan`,
      isActive: false,
      status: "pending",
      generationInput: input,
      ...(requestId ? { requestId } : {}),
      age: input.age,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
    });

    await ctx.scheduler.runAfter(0, internal.generation.generatePlan, {
      planId,
      attempt: 0,
    });

    return planId;
  },
});

export const authorizeVoiceRequest = mutation({
  args: { requestId: v.string(), consentAccepted: v.boolean() },
  handler: async (ctx, { requestId, consentAccepted }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to start voice generation.");
    if (!consentAccepted) {
      throw new Error("Accept the medical disclaimer before starting a call.");
    }
    if (requestId.length < 1 || requestId.length > 100) {
      throw new Error("Invalid voice generation request.");
    }

    const existingRequest = await ctx.db
      .query("generationSessions")
      .withIndex("by_request_id", (q) => q.eq("requestId", requestId))
      .first();
    if (existingRequest) throw new Error("This voice request has already been used.");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) {
      throw new Error("Your profile is still syncing. Please retry in a moment.");
    }
    if (user.deletingAt) {
      throw new Error("Account deletion is in progress.");
    }
    await ctx.db.patch(user._id, {
      medicalDisclaimerAcceptedAt: Date.now(),
    });

    await reserveGeneration(ctx, identity.subject);
    await ctx.db.insert("generationSessions", {
      requestId,
      userId: identity.subject,
      startedAt: Date.now(),
      consumed: false,
    });
    return requestId;
  },
});

export const getGenerationInput = internalQuery({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const plan = await ctx.db.get(planId);
    if (
      !plan ||
      plan.deletingAt ||
      plan.status !== "pending" ||
      !plan.generationInput
    ) {
      return null;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", plan.userId))
      .first();
    if (!user || user.deletingAt) return null;
    return { userId: plan.userId, input: plan.generationInput };
  },
});

export const markPlanReady = internalMutation({
  args: {
    planId: v.id("plans"),
    workoutPlan: workoutPlanValidator,
    dietPlan: dietPlanValidator,
  },
  handler: async (ctx, { planId, workoutPlan, dietPlan }) => {
    const plan = await ctx.db.get(planId);
    if (!plan || plan.deletingAt || plan.status !== "pending") return;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", plan.userId))
      .first();
    if (!user || user.deletingAt) return;

    const activePlans = await ctx.db
      .query("plans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", plan.userId).eq("isActive", true),
      )
      .take(100);

    for (const activePlan of activePlans) {
      await ctx.db.patch(activePlan._id, { isActive: false });
    }

    const reminder = await ctx.db
      .query("workoutReminders")
      .withIndex("by_user", (q) => q.eq("userId", plan.userId))
      .first();
    if (reminder?.enabled) {
      await ctx.db.patch(reminder._id, {
        enabled: false,
        scheduleVersion:
          (typeof reminder.scheduleVersion === "number"
            ? reminder.scheduleVersion
            : 0) + 1,
      });
    }

    await ctx.db.patch(planId, {
      workoutPlan,
      dietPlan,
      status: "ready",
      failureReason: undefined,
      isActive: true,
    });
  },
});

export const retryOrFailPlan = internalMutation({
  args: {
    planId: v.id("plans"),
    attempt: v.number(),
  },
  handler: async (ctx, { planId, attempt }) => {
    const plan = await ctx.db.get(planId);
    if (!plan || plan.deletingAt || plan.status !== "pending") return;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", plan.userId))
      .first();
    if (!user || user.deletingAt) return;

    if (attempt === 0) {
      await ctx.scheduler.runAfter(0, internal.generation.generatePlan, {
        planId,
        attempt: 1,
      });
      return;
    }

    await ctx.db.patch(planId, {
      status: "failed",
      isActive: false,
      failureReason: "We couldn't generate this plan. Please try again.",
    });
  },
});

export const getPlan = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const plan = await ctx.db.get(planId);
    return plan?.userId === identity.subject ? plan : null;
  },
});

export const getPlanForRequest = query({
  args: { requestId: v.string() },
  handler: async (ctx, { requestId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("plans")
      .withIndex("by_user_request_id", (q) =>
        q.eq("userId", identity.subject).eq("requestId", requestId),
      )
      .first();
  },
});

export const getUserPlans = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== userId) return [];

    return await ctx.db
      .query("plans")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const retryFailedPlan = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to retry plan generation.");

    const plan = await ctx.db.get(planId);
    if (!plan || plan.userId !== identity.subject || plan.status !== "failed") {
      throw new Error("This failed plan cannot be retried.");
    }
    if (!plan.generationInput) {
      throw new Error("This plan is missing its generation details.");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user || user.deletingAt || !user.medicalDisclaimerAcceptedAt) {
      throw new Error("Your account is unavailable for plan generation.");
    }

    await reserveGeneration(ctx, identity.subject);
    const reminder = await ctx.db
      .query("workoutReminders")
      .withIndex("by_plan_id", (q) => q.eq("planId", plan._id))
      .first();
    if (reminder?.enabled) {
      await ctx.db.patch(reminder._id, {
        enabled: false,
        scheduleVersion:
          (typeof reminder.scheduleVersion === "number"
            ? reminder.scheduleVersion
            : 0) + 1,
      });
    }
    await ctx.db.patch(planId, {
      status: "pending",
      failureReason: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.generation.generatePlan, {
      planId,
      attempt: 0,
    });
    return planId;
  },
});

export const setUnitPreference = mutation({
  args: { preference: unitPreferenceValidator },
  handler: async (ctx, { preference }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to change your unit preference.");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("Your profile is still syncing. Please retry.");
    if (user.deletingAt) throw new Error("Account deletion is in progress.");

    await ctx.db.patch(user._id, { unitPreference: preference });
    return preference;
  },
});

export const setPlanActive = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const plan = await getOwnedPlan(ctx, planId);
    if (
      (plan.status && plan.status !== "ready") ||
      !plan.workoutPlan ||
      !plan.dietPlan
    ) {
      throw new Error("Only a ready plan can be made active.");
    }

    const activePlans = await ctx.db
      .query("plans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", plan.userId).eq("isActive", true),
      )
      .take(100);
    for (const activePlan of activePlans) {
      if (activePlan._id !== plan._id) {
        await ctx.db.patch(activePlan._id, { isActive: false });
      }
    }
    const reminder = await ctx.db
      .query("workoutReminders")
      .withIndex("by_user", (q) => q.eq("userId", plan.userId))
      .first();
    if (reminder?.enabled && reminder.planId !== plan._id) {
      await ctx.db.patch(reminder._id, {
        enabled: false,
        scheduleVersion:
          (typeof reminder.scheduleVersion === "number"
            ? reminder.scheduleVersion
            : 0) + 1,
      });
    }
    await ctx.db.patch(plan._id, { isActive: true });
  },
});

export const editPlan = mutation({
  args: {
    planId: v.id("plans"),
    name: v.string(),
    workoutPlan: workoutPlanValidator,
  },
  handler: async (ctx, { planId, name, workoutPlan }) => {
    const plan = await getOwnedPlan(ctx, planId);
    if (plan.status && plan.status !== "ready") {
      throw new Error("Wait until the plan is ready before editing it.");
    }
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > 100) {
      throw new Error("Plan name must be between 1 and 100 characters.");
    }
    if (
      workoutPlan.schedule.length > 7 ||
      workoutPlan.exercises.length > 7 ||
      workoutPlan.exercises.some(
        (day) =>
          !day.day.trim() ||
          day.day.length > 40 ||
          day.routines.length > 50 ||
          day.routines.some(
            (routine) =>
              !routine.name.trim() ||
              routine.name.length > 120 ||
              (routine.description?.length ?? 0) > 1000 ||
              (routine.notes?.length ?? 0) > 1000 ||
              (routine.duration?.length ?? 0) > 80 ||
              (routine.sets !== undefined &&
                (!Number.isInteger(routine.sets) ||
                  routine.sets < 1 ||
                  routine.sets > 100)) ||
              (routine.reps !== undefined &&
                (!Number.isInteger(routine.reps) ||
                  routine.reps < 1 ||
                  routine.reps > 1000)) ||
              (routine.restSeconds !== undefined &&
                (!Number.isInteger(routine.restSeconds) ||
                  routine.restSeconds < 0 ||
                  routine.restSeconds > 3600)),
          ),
      )
    ) {
      throw new Error("Review the workout details; one or more values are invalid.");
    }

    await savePlanVersion(ctx, plan);
    await ctx.db.patch(plan._id, {
      name: normalizedName,
      workoutPlan,
    });
  },
});

export const duplicatePlan = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const plan = await getOwnedPlan(ctx, planId);
    if (!plan.workoutPlan || !plan.dietPlan || (plan.status && plan.status !== "ready")) {
      throw new Error("Only a ready plan can be duplicated.");
    }

    return await ctx.db.insert("plans", {
      userId: plan.userId,
      name: `${plan.name} (Copy)`.slice(0, 100),
      workoutPlan: plan.workoutPlan,
      dietPlan: plan.dietPlan,
      isActive: false,
      status: "ready",
      age: plan.age,
      heightCm: plan.heightCm,
      weightKg: plan.weightKg,
      ...(plan.generationInput ? { generationInput: plan.generationInput } : {}),
    });
  },
});

export const beginDeletePlan = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const plan = await getOwnedPlan(ctx, planId);
    await ctx.db.patch(plan._id, {
      deletingAt: Date.now(),
      isActive: false,
    });
    const reminder = await ctx.db
      .query("workoutReminders")
      .withIndex("by_plan_id", (q) => q.eq("planId", plan._id))
      .first();
    if (reminder?.enabled) {
      await ctx.db.patch(reminder._id, {
        enabled: false,
        scheduleVersion:
          (typeof reminder.scheduleVersion === "number"
            ? reminder.scheduleVersion
            : 0) + 1,
      });
    }
    await ctx.scheduler.runAfter(0, internal.plans.deletePlanBatch, {
      planId,
    });
  },
});

export const deletePlanBatch = internalMutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const plan = await ctx.db.get(planId);
    if (!plan || !plan.deletingAt) return;

    const versions = await ctx.db
      .query("planVersions")
      .withIndex("by_plan_id", (q) => q.eq("planId", planId))
      .take(RELATED_DELETE_BATCH_SIZE);
    const shares = await ctx.db
      .query("planShares")
      .withIndex("by_plan_id", (q) => q.eq("planId", planId))
      .take(RELATED_DELETE_BATCH_SIZE);
    const workoutLogs = await ctx.db
      .query("workoutLogs")
      .withIndex("by_plan_id", (q) => q.eq("planId", planId))
      .take(RELATED_DELETE_BATCH_SIZE);
    const reminders = await ctx.db
      .query("workoutReminders")
      .withIndex("by_plan_id", (q) => q.eq("planId", planId))
      .take(RELATED_DELETE_BATCH_SIZE);

    for (const version of versions) await ctx.db.delete(version._id);
    for (const share of shares) await ctx.db.delete(share._id);
    for (const log of workoutLogs) await ctx.db.delete(log._id);
    for (const reminder of reminders) await ctx.db.delete(reminder._id);

    if (
      versions.length === RELATED_DELETE_BATCH_SIZE ||
      shares.length === RELATED_DELETE_BATCH_SIZE ||
      workoutLogs.length === RELATED_DELETE_BATCH_SIZE ||
      reminders.length === RELATED_DELETE_BATCH_SIZE
    ) {
      await ctx.scheduler.runAfter(0, internal.plans.deletePlanBatch, {
        planId,
      });
      return;
    }

    await ctx.db.delete(planId);
  },
});

export const regeneratePlan = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const plan = await getOwnedPlan(ctx, planId);
    if (!plan.generationInput) {
      throw new Error("This plan has no saved generation details to regenerate.");
    }
    validateGenerationInput(plan.generationInput);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", plan.userId))
      .first();
    if (!user || !user.medicalDisclaimerAcceptedAt) {
      throw new Error("Accept the medical disclaimer before regenerating.");
    }
    if (user.deletingAt) throw new Error("Account deletion is in progress.");

    await reserveGeneration(ctx, plan.userId);
    if (plan.workoutPlan || plan.dietPlan) await savePlanVersion(ctx, plan);
    const reminder = await ctx.db
      .query("workoutReminders")
      .withIndex("by_plan_id", (q) => q.eq("planId", plan._id))
      .first();
    if (reminder?.enabled) {
      await ctx.db.patch(reminder._id, {
        enabled: false,
        scheduleVersion:
          (typeof reminder.scheduleVersion === "number"
            ? reminder.scheduleVersion
            : 0) + 1,
      });
    }
    await ctx.db.patch(plan._id, {
      status: "pending",
      failureReason: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.generation.generatePlan, {
      planId,
      attempt: 0,
    });
  },
});

export const getPlanVersions = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const plan = await ctx.db.get(planId);
    if (!plan || plan.userId !== identity.subject) return [];

    return await ctx.db
      .query("planVersions")
      .withIndex("by_plan_id", (q) => q.eq("planId", planId))
      .order("desc")
      .take(20);
  },
});

export const logWorkout = mutation({
  args: {
    planId: v.id("plans"),
    day: v.string(),
    submissionId: v.string(),
    exercises: v.array(
      v.object({
        name: v.string(),
        completed: v.optional(v.boolean()),
        duration: v.optional(v.string()),
        sets: v.array(
          v.object({
            targetReps: v.optional(v.number()),
            completed: v.boolean(),
            reps: v.optional(v.number()),
            weightKg: v.optional(v.number()),
          }),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const plan = await getOwnedPlan(ctx, args.planId);
    if (!plan.workoutPlan || (plan.status && plan.status !== "ready")) {
      throw new Error("Only a ready plan can be logged.");
    }
    const selectedDay = plan.workoutPlan.exercises.find(
      (day) => day.day === args.day,
    );
    if (!selectedDay) {
      throw new Error("That day is not part of this plan.");
    }
    if (!args.submissionId || args.submissionId.length > 100) {
      throw new Error("Invalid workout submission.");
    }
    const setCount = args.exercises.reduce(
      (count, exercise) => count + exercise.sets.length,
      0,
    );
    if (setCount > 300 || args.exercises.length > 100) {
      throw new Error("This workout entry contains too many sets.");
    }
    const expectedRoutines = new Map(
      selectedDay.routines.map((routine) => [routine.name, routine]),
    );
    const submittedNames = new Set<string>();
    if (
      args.exercises.some(
        (exercise) => {
          const expected = expectedRoutines.get(exercise.name);
          const isTimed =
            expected?.duration !== undefined &&
            expected.sets === undefined &&
            expected.reps === undefined;
          if (
            !expected ||
            submittedNames.has(exercise.name) ||
            (isTimed && exercise.sets.length > 0) ||
            (isTimed && exercise.duration !== expected.duration) ||
            (!isTimed &&
              exercise.sets.length !== (expected.sets ?? 1))
          ) {
            return true;
          }
          submittedNames.add(exercise.name);
          return exercise.sets.length > 30 || exercise.sets.some(
            (set) =>
              (set.targetReps !== undefined &&
                (!Number.isInteger(set.targetReps) ||
                  set.targetReps < 1 ||
                  set.targetReps > 1000)) ||
              (set.reps !== undefined &&
                (!Number.isInteger(set.reps) || set.reps < 0 || set.reps > 1000)) ||
              (set.weightKg !== undefined &&
                (!Number.isFinite(set.weightKg) ||
                  set.weightKg < 0 ||
                  set.weightKg > 1000)),
          );
        },
      )
    ) {
      throw new Error("Workout entries must match this day's exercises and valid set values.");
    }

    const existing = await ctx.db
      .query("workoutLogs")
      .withIndex("by_user_submission", (q) =>
        q.eq("userId", plan.userId).eq("submissionId", args.submissionId),
      )
      .first();
    if (existing) {
      if (existing.planId !== plan._id) {
        throw new Error("Workout submission does not match this plan.");
      }
      return existing._id;
    }

    const completedAt = Date.now();
    return await ctx.db.insert("workoutLogs", {
      userId: plan.userId,
      planId: plan._id,
      day: args.day,
      submissionId: args.submissionId,
      exercises: args.exercises,
      completedAt,
      dateKey: new Date(completedAt).toISOString().slice(0, 10),
    });
  },
});

export const getWorkoutHistory = query({
  args: { planId: v.optional(v.id("plans")) },
  handler: async (ctx, { planId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    if (planId) {
      const plan = await ctx.db.get(planId);
      if (!plan || plan.userId !== identity.subject) return [];
      const history = await ctx.db
        .query("workoutLogs")
        .withIndex("by_plan_id", (q) => q.eq("planId", planId))
        .order("desc")
        .take(50);
      return history.filter(isWorkoutHistoryRecord);
    }

    const history = await ctx.db
      .query("workoutLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", identity.subject),
      )
      .order("desc")
      .take(50);
    return history.filter(isWorkoutHistoryRecord);
  },
});

export const addMeasurement = mutation({
  args: {
    weightKg: v.number(),
    waistCm: v.optional(v.number()),
    hipCm: v.optional(v.number()),
    chestCm: v.optional(v.number()),
  },
  handler: async (ctx, measurement) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to log measurements.");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user || user.deletingAt) {
      throw new Error("Your account is unavailable for measurement logging.");
    }
    if (
      !Number.isFinite(measurement.weightKg) ||
      measurement.weightKg < 30 ||
      measurement.weightKg > 350
    ) {
      throw new Error("Weight must be between 30 and 350 kg.");
    }
    for (const value of [
      measurement.waistCm,
      measurement.hipCm,
      measurement.chestCm,
    ]) {
      if (value !== undefined && (!Number.isFinite(value) || value < 30 || value > 250)) {
        throw new Error("Optional measurements must be between 30 and 250 cm.");
      }
    }

    const date = new Date().toISOString().slice(0, 10);
    const existing = await ctx.db
      .query("measurementHistory")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", identity.subject).eq("date", date),
      )
      .first();
    const document = {
      userId: identity.subject,
      date,
      recordedAt: Date.now(),
      ...measurement,
    };

    if (existing) {
      await ctx.db.patch(existing._id, document);
      return existing._id;
    }
    return await ctx.db.insert("measurementHistory", document);
  },
});

export const getMeasurements = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const measurements = await ctx.db
      .query("measurementHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(90);
    return measurements.filter(isMeasurementRecord);
  },
});

function generateShareToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const createPlanShare = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const plan = await getOwnedPlan(ctx, planId);
    if (!plan.workoutPlan || !plan.dietPlan || (plan.status && plan.status !== "ready")) {
      throw new Error("Only a ready plan can be shared.");
    }
    const existingShares = await ctx.db
      .query("planShares")
      .withIndex("by_plan_id", (q) => q.eq("planId", plan._id))
      .take(20);
    if (existingShares.length >= 20) {
      throw new Error("This plan already has the maximum of 20 active share links.");
    }

    const shareToken = generateShareToken();
    const shareId = await ctx.db.insert("planShares", {
      userId: plan.userId,
      planId: plan._id,
      shareToken,
      createdAt: Date.now(),
    });
    return { shareId, shareToken };
  },
});

export const revokePlanShare = mutation({
  args: { shareId: v.id("planShares") },
  handler: async (ctx, { shareId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to manage a plan share.");
    const share = await ctx.db.get(shareId);
    if (!share || share.userId !== identity.subject) {
      throw new Error("Share not found or access denied.");
    }
    await ctx.db.delete(shareId);
  },
});

export const getPlanShares = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const plan = await ctx.db.get(planId);
    if (!plan || plan.userId !== identity.subject) return [];
    return await ctx.db
      .query("planShares")
      .withIndex("by_plan_id", (q) => q.eq("planId", planId))
      .order("desc")
      .take(20);
  },
});

export const getSharedPlan = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const share = await ctx.db
      .query("planShares")
      .withIndex("by_share_token", (q) => q.eq("shareToken", token))
      .first();
    if (!share) return null;

    if (typeof share.planId !== "string") return null;
    const plan = await ctx.db.get(share.planId as Id<"plans">);
    if (
      !plan ||
      plan.deletingAt ||
      (plan.status && plan.status !== "ready") ||
      !plan.workoutPlan ||
      !plan.dietPlan
    ) {
      return null;
    }

    return {
      workoutPlan: plan.workoutPlan,
      dietPlan: plan.dietPlan,
      safetyFootnote:
        "General educational content only; not medical advice. Consult a qualified professional before changing exercise or nutrition.",
    };
  },
});

function toOpenSession(
  doc: unknown,
  now: number,
): { requestId: string; userId: string } | null {
  if (!isRecord(doc)) return null;
  if (
    doc.consumed !== false ||
    typeof doc.startedAt !== "number" ||
    now - doc.startedAt > 10 * 60_000 ||
    typeof doc.requestId !== "string" ||
    typeof doc.userId !== "string"
  ) {
    return null;
  }
  return { requestId: doc.requestId, userId: doc.userId };
}

// Finds the voice session a tool call belongs to. The model may send a wrong
// or missing user_id / generation_id, so the lookup tries, in order: the exact
// generation_id, the newest open session for the given user_id, and finally
// the newest open session when every open session belongs to the same user.
export const findOpenVoiceRequest = internalQuery({
  args: {
    userId: v.optional(v.string()),
    requestId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, requestId }) => {
    const now = Date.now();

    if (requestId) {
      const byRequest = await ctx.db
        .query("generationSessions")
        .withIndex("by_request_id", (q) => q.eq("requestId", requestId))
        .first();
      const open = toOpenSession(byRequest, now);
      if (open) return open;
    }

    if (userId) {
      const byUser = await ctx.db
        .query("generationSessions")
        .withIndex("by_user_created_at", (q) => q.eq("userId", userId))
        .order("desc")
        .first();
      const open = toOpenSession(byUser, now);
      if (open) return open;
    }

    const recent = await ctx.db.query("generationSessions").order("desc").take(20);
    const openSessions = recent
      .map((doc) => toOpenSession(doc, now))
      .filter(
        (session): session is { requestId: string; userId: string } =>
          session !== null,
      );
    if (
      openSessions.length > 0 &&
      new Set(openSessions.map((session) => session.userId)).size === 1
    ) {
      return openSessions[0];
    }
    return null;
  },
});