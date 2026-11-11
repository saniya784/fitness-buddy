import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Mutation to sync authenticated Clerk user profiles into the Convex database.
 * If a user with the matching clerkId already exists, it skips duplicate insertion.
 */
export const syncUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
      .first();

    if (existingUser) return existingUser._id;

    const userId = await ctx.db.insert("users", args);
    return userId;
  },
});

/**
 * Optional Helper Query: Fetch a synchronized user by their Clerk ID string.
 */
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
      .first();
  },
});

export const getUnitPreference = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return "metric" as const;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    return user?.unitPreference ?? "metric";
  },
});

export const recordMedicalDisclaimer = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
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
  },
});