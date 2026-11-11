import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";

const PAGE_SIZE = 100;
const DELETE_BATCH_SIZE = 25;

const exportTableValidator = v.union(
  v.literal("users"),
  v.literal("plans"),
  v.literal("achievements"),
  v.literal("coachCallHistory"),
  v.literal("dailyLogs"),
  v.literal("generationRateLimits"),
  v.literal("generationSessions"),
  v.literal("measurementHistory"),
  v.literal("planShares"),
  v.literal("planVersions"),
  v.literal("workoutLogs"),
  v.literal("workoutReminders"),
);

type ExportTable =
  | "users"
  | "plans"
  | "achievements"
  | "coachCallHistory"
  | "dailyLogs"
  | "generationRateLimits"
  | "generationSessions"
  | "measurementHistory"
  | "planShares"
  | "planVersions"
  | "workoutLogs"
  | "workoutReminders";

const exportTables: ExportTable[] = [
  "users",
  "plans",
  "achievements",
  "coachCallHistory",
  "dailyLogs",
  "generationRateLimits",
  "generationSessions",
  "measurementHistory",
  "planShares",
  "planVersions",
  "workoutLogs",
  "workoutReminders",
];

export const exportPage = internalQuery({
  args: {
    userId: v.string(),
    table: exportTableValidator,
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { userId, table, cursor }) => {
    switch (table) {
      case "users":
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
          .paginate({ numItems: PAGE_SIZE, cursor });
      case "plans":
        return await ctx.db
          .query("plans")
          .withIndex("by_user_id", (q) => q.eq("userId", userId))
          .paginate({ numItems: PAGE_SIZE, cursor });
      case "achievements":
        return await ctx.db
          .query("achievements")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .paginate({ numItems: PAGE_SIZE, cursor });
      case "coachCallHistory":
        return await ctx.db
          .query("coachCallHistory")
          .withIndex("by_user_ended_at", (q) => q.eq("userId", userId))
          .paginate({ numItems: PAGE_SIZE, cursor });
      case "dailyLogs":
        return await ctx.db
          .query("dailyLogs")
          .withIndex("by_user_date", (q) => q.eq("userId", userId))
          .paginate({ numItems: PAGE_SIZE, cursor });
      case "generationRateLimits":
        return await ctx.db
          .query("generationRateLimits")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .paginate({ numItems: PAGE_SIZE, cursor });
      case "generationSessions":
        return await ctx.db
          .query("generationSessions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .paginate({ numItems: PAGE_SIZE, cursor });
      case "measurementHistory":
        return await ctx.db
          .query("measurementHistory")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .paginate({ numItems: PAGE_SIZE, cursor });
      case "planShares":
        return await ctx.db
          .query("planShares")
          .withIndex("by_user_id", (q) => q.eq("userId", userId))
          .paginate({ numItems: PAGE_SIZE, cursor });
      case "planVersions":
        return await ctx.db
          .query("planVersions")
          .withIndex("by_user_id", (q) => q.eq("userId", userId))
          .paginate({ numItems: PAGE_SIZE, cursor });
      case "workoutLogs":
        return await ctx.db
          .query("workoutLogs")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .paginate({ numItems: PAGE_SIZE, cursor });
      case "workoutReminders":
        return await ctx.db
          .query("workoutReminders")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .paginate({ numItems: PAGE_SIZE, cursor });
    }
  },
});

export const exportMyData = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    exportedAt: string;
    accountId: string;
    data: Record<string, unknown[]>;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to export your account data.");

    const data: Record<string, unknown[]> = {};
    for (const table of exportTables) {
      const docs: unknown[] = [];
      let cursor: string | null = null;
      let isDone = false;
      while (!isDone) {
        const result: {
          page: unknown[];
          continueCursor: string;
          isDone: boolean;
        } = await ctx.runQuery(internal.accounts.exportPage, {
          userId: identity.subject,
          table,
          cursor,
        });
        docs.push(...result.page);
        cursor = result.continueCursor;
        isDone = result.isDone;
      }
      data[table] = docs;
    }

    return {
      exportedAt: new Date().toISOString(),
      accountId: identity.subject,
      data,
    };
  },
});

async function deleteUserBatch(ctx: MutationCtx, userId: string) {
  const batches = [
    await ctx.db
      .query("plans")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .take(DELETE_BATCH_SIZE),
    await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(DELETE_BATCH_SIZE),
    await ctx.db
      .query("coachCallHistory")
      .withIndex("by_user_ended_at", (q) => q.eq("userId", userId))
      .take(DELETE_BATCH_SIZE),
    await ctx.db
      .query("dailyLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .take(DELETE_BATCH_SIZE),
    await ctx.db
      .query("generationRateLimits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(DELETE_BATCH_SIZE),
    await ctx.db
      .query("generationSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(DELETE_BATCH_SIZE),
    await ctx.db
      .query("measurementHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(DELETE_BATCH_SIZE),
    await ctx.db
      .query("planShares")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .take(DELETE_BATCH_SIZE),
    await ctx.db
      .query("planVersions")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .take(DELETE_BATCH_SIZE),
    await ctx.db
      .query("workoutLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(DELETE_BATCH_SIZE),
    await ctx.db
      .query("workoutReminders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(DELETE_BATCH_SIZE),
  ];

  let hasMore = batches.some((batch) => batch.length === DELETE_BATCH_SIZE);
  for (const batch of batches) {
    for (const document of batch) {
      await ctx.db.delete(document._id);
    }
  }

  const users = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
    .take(DELETE_BATCH_SIZE);
  if (users.length === DELETE_BATCH_SIZE) hasMore = true;
  for (const user of users) {
    await ctx.db.delete(user._id);
  }

  return { hasMore };
}

export const deleteUserDataBatch = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await deleteUserBatch(ctx, userId);
  },
});

export const markUserDeleting = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
      .first();
    if (user && !user.deletingAt) {
      await ctx.db.patch(user._id, { deletingAt: Date.now() });
    }
  },
});

export const deleteMyAccount = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to delete your account.");

    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) {
      throw new Error(
        "Account deletion is not configured. The operator must set CLERK_SECRET_KEY in Convex.",
      );
    }

    await ctx.runMutation(internal.accounts.markUserDeleting, {
      userId: identity.subject,
    });

    for (let batch = 0; batch < 1000; batch += 1) {
      const { hasMore } = await ctx.runMutation(
        internal.accounts.deleteUserDataBatch,
        { userId: identity.subject },
      );
      if (!hasMore) break;
      if (batch === 999) {
        throw new Error(
          "Account data deletion is taking longer than expected. Retry this action or contact support.",
        );
      }
    }

    const response = await fetch(
      `https://api.clerk.com/v1/users/${encodeURIComponent(identity.subject)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${clerkSecret}` },
      },
    );
    if (!response.ok && response.status !== 404) {
      throw new Error(
        `Application data was deleted, but Clerk could not delete the account (HTTP ${response.status}). Contact support to finish account deletion.`,
      );
    }

    return { deleted: true };
  },
});
