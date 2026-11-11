import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  dietPlanValidator,
  generationInputValidator,
  planStatusValidator,
  unitPreferenceValidator,
  workoutPlanValidator,
} from "./validators";

const legacyTable = () => defineTable(v.any());

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    clerkId: v.string(),
    tokenIdentifier: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
    unitPreference: v.optional(unitPreferenceValidator),
    medicalDisclaimerAcceptedAt: v.optional(v.number()),
    deletingAt: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_token_identifier", ["tokenIdentifier"]),

  plans: defineTable({
    userId: v.string(),
    name: v.string(),
    workoutPlan: v.optional(workoutPlanValidator),
    dietPlan: v.optional(dietPlanValidator),
    isActive: v.boolean(),
    status: v.optional(planStatusValidator),
    failureReason: v.optional(v.string()),
    generationInput: v.optional(generationInputValidator),
    requestId: v.optional(v.string()),
    age: v.optional(v.number()),
    heightCm: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    deletingAt: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"]) // ✅ FIXED: Bound index directly to the plans table
    .index("active_plans", ["isActive"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_user_request_id", ["userId", "requestId"])
    .index("by_user_deleting", ["userId", "deletingAt"]),

  // Preserve deployed table documents whose field contracts are not present in this repository.
  achievements: legacyTable()
    .index("by_user", ["userId"])
    .index("by_user_key", ["userId", "key"]),
  coachCallHistory: legacyTable()
    .index("by_session", ["sessionId"])
    .index("by_user_ended_at", ["userId", "endedAt"]),
  dailyLogs: legacyTable().index("by_user_date", ["userId", "dateKey"]),
  generationRateLimits: legacyTable().index("by_user", [
    "userId",
    "generationType",
  ]),
  generationSessions: legacyTable()
    .index("by_user", ["userId"])
    .index("by_user_created_at", ["userId", "startedAt"])
    .index("by_request_id", ["requestId"]),
  measurementHistory: legacyTable()
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),
  planShares: legacyTable()
    .index("by_plan_id", ["planId"])
    .index("by_share_token", ["shareToken"])
    .index("by_user_id", ["userId"]),
  planVersions: legacyTable()
    .index("by_user_id", ["userId"])
    .index("by_plan_id", ["planId"])
    .index("by_plan_version", ["planId", "versionNumber"]),
  workoutLogs: legacyTable()
    .index("by_user_date", ["userId", "completedAt"])
    .index("by_user_submission", ["userId", "submissionId"])
    .index("by_user", ["userId"])
    .index("by_plan_id", ["planId"]),
  workoutReminders: legacyTable()
    .index("by_user_enabled", ["userId", "enabled"])
    .index("by_user", ["userId"])
    .index("by_unsubscribe_token", ["unsubscribeToken"])
    .index("by_plan_id", ["planId"]),
});