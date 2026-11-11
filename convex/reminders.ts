import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const DAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};
const VALID_DAYS = Object.keys(DAY_INDEX);

function validatedAppUrl(appUrl: string): string {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(appUrl);
  } catch {
    throw new Error("APP_URL must be a valid absolute URL.");
  }

  const isLocalHttp =
    parsedUrl.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname);
  if (
    parsedUrl.protocol !== "https:" &&
    (process.env.NODE_ENV === "production" || !isLocalHttp)
  ) {
    throw new Error("APP_URL must use HTTPS in production.");
  }
  if (
    process.env.NODE_ENV === "production" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname)
  ) {
    throw new Error("APP_URL must use the public production origin.");
  }

  return appUrl.replace(/\/$/, "");
}

function makeToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function nextReminderTime(
  days: string[],
  hourUtc: number,
  minuteUtc: number,
  now = Date.now(),
) {
  const allowedDays = new Set(days.map((day) => DAY_INDEX[day]));
  for (let offset = 0; offset <= 7; offset += 1) {
    const date = new Date(now);
    date.setUTCHours(hourUtc, minuteUtc, 0, 0);
    date.setUTCDate(date.getUTCDate() + offset);
    if (allowedDays.has(date.getUTCDay()) && date.getTime() > now) {
      return date.getTime();
    }
  }
  throw new Error("Could not schedule the next reminder.");
}

export const getReminder = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const reminder = await ctx.db
      .query("workoutReminders")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
    if (!reminder) return null;

    const days: string[] = Array.isArray(reminder.days)
      ? reminder.days.filter(
          (day: unknown): day is string => typeof day === "string",
        )
      : [];
    return {
      planId: typeof reminder.planId === "string" ? reminder.planId : "",
      days,
      hourUtc: typeof reminder.hourUtc === "number" ? reminder.hourUtc : 9,
      minuteUtc:
        typeof reminder.minuteUtc === "number" ? reminder.minuteUtc : 0,
      enabled: reminder.enabled === true,
      ...(typeof reminder.nextSendAt === "number"
        ? { nextSendAt: reminder.nextSendAt }
        : {}),
      ...(typeof reminder.lastError === "string"
        ? { lastError: reminder.lastError }
        : {}),
    };
  },
});

export const upsertReminder = internalMutation({
  args: {
    userId: v.string(),
    planId: v.id("plans"),
    days: v.array(v.string()),
    hourUtc: v.number(),
    minuteUtc: v.number(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (
      args.days.length > 7 ||
      args.days.some((day) => !VALID_DAYS.includes(day)) ||
      (args.enabled && args.days.length === 0)
    ) {
      throw new Error("Choose at least one valid workout day.");
    }
    if (
      !Number.isInteger(args.hourUtc) ||
      args.hourUtc < 0 ||
      args.hourUtc > 23 ||
      !Number.isInteger(args.minuteUtc) ||
      args.minuteUtc < 0 ||
      args.minuteUtc > 59
    ) {
      throw new Error("Choose a valid UTC reminder time.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
      .first();
    if (!user || user.deletingAt) {
      throw new Error("Your account is unavailable for reminders.");
    }

    const plan = await ctx.db.get(args.planId);
    if (
      !plan ||
      plan.userId !== args.userId ||
      !plan.isActive ||
      (plan.status && plan.status !== "ready") ||
      !plan.workoutPlan
    ) {
      throw new Error("Choose one of your active, ready plans.");
    }
    if (args.days.some((day) => !plan.workoutPlan!.schedule.includes(day))) {
      throw new Error("Reminder days must match the active plan schedule.");
    }

    const existing = await ctx.db
      .query("workoutReminders")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    const scheduleVersion =
      typeof existing?.scheduleVersion === "number"
        ? existing.scheduleVersion + 1
        : 1;
    const unsubscribeToken =
      typeof existing?.unsubscribeToken === "string"
        ? existing.unsubscribeToken
        : makeToken();
    const nextSendAt = args.enabled
      ? nextReminderTime(args.days, args.hourUtc, args.minuteUtc)
      : undefined;
    const values = {
      userId: args.userId,
      planId: args.planId,
      days: args.days,
      hourUtc: args.hourUtc,
      minuteUtc: args.minuteUtc,
      enabled: args.enabled,
      scheduleVersion,
      unsubscribeToken,
      ...(nextSendAt !== undefined ? { nextSendAt } : {}),
      lastError: undefined,
      updatedAt: Date.now(),
    };

    const reminderId = existing
      ? existing._id
      : await ctx.db.insert("workoutReminders", values);
    if (existing) await ctx.db.patch(reminderId, values);

    if (args.enabled && nextSendAt !== undefined) {
      await ctx.scheduler.runAt(
        nextSendAt,
        internal.reminders.deliverReminder,
        { reminderId, scheduleVersion },
      );
    }
    return { enabled: args.enabled, nextSendAt };
  },
});

export const configureReminder = action({
  args: {
    planId: v.id("plans"),
    days: v.array(v.string()),
    hourUtc: v.number(),
    minuteUtc: v.number(),
    enabled: v.boolean(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ enabled: boolean; nextSendAt: number | undefined }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to configure reminders.");

    if (args.enabled) {
      if (!process.env.RESEND_API_KEY || !process.env.REMINDER_FROM_EMAIL) {
        throw new Error(
          "Email reminders are not configured. Ask the site operator to configure Resend.",
        );
      }
      if (!process.env.APP_URL) {
        throw new Error(
          "Email reminders need the public app URL configured by the operator.",
        );
      }
      validatedAppUrl(process.env.APP_URL);
    }

    return await ctx.runMutation(internal.reminders.upsertReminder, {
      ...args,
      userId: identity.subject,
    });
  },
});

export const getReminderDeliveryDetails = internalQuery({
  args: {
    reminderId: v.id("workoutReminders"),
    scheduleVersion: v.number(),
  },
  handler: async (ctx, { reminderId, scheduleVersion }) => {
    const reminder = await ctx.db.get(reminderId);
    if (
      !reminder ||
      reminder.enabled !== true ||
      reminder.scheduleVersion !== scheduleVersion
    ) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", reminder.userId))
      .first();
    if (!user || user.deletingAt || !user.email) return null;

    if (typeof reminder.planId !== "string") return null;
    const plan = await ctx.db.get(reminder.planId as Id<"plans">);
    if (
      !plan ||
      plan.userId !== reminder.userId ||
      !plan.isActive ||
      (plan.status && plan.status !== "ready")
    ) {
      return null;
    }

    const days: string[] = Array.isArray(reminder.days)
      ? reminder.days.filter(
          (day: unknown): day is string => typeof day === "string",
        )
      : [];
    if (
      !days.length ||
      typeof reminder.hourUtc !== "number" ||
      typeof reminder.minuteUtc !== "number" ||
      typeof reminder.unsubscribeToken !== "string"
    ) {
      return null;
    }

    return {
      email: user.email,
      days,
      hourUtc: reminder.hourUtc,
      minuteUtc: reminder.minuteUtc,
      unsubscribeToken: reminder.unsubscribeToken,
    };
  },
});

export const scheduleNextReminder = internalMutation({
  args: {
    reminderId: v.id("workoutReminders"),
    scheduleVersion: v.number(),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.reminderId);
    if (
      !reminder ||
      reminder.enabled !== true ||
      reminder.scheduleVersion !== args.scheduleVersion
    ) {
      return;
    }

    const nextSendAt = nextReminderTime(
      reminder.days as string[],
      reminder.hourUtc as number,
      reminder.minuteUtc as number,
    );
    await ctx.db.patch(reminder._id, {
      nextSendAt,
      lastError: args.lastError,
    });
    await ctx.scheduler.runAt(
      nextSendAt,
      internal.reminders.deliverReminder,
      {
        reminderId: reminder._id,
        scheduleVersion: args.scheduleVersion,
      },
    );
  },
});

export const completeReminderDelivery = internalMutation({
  args: {
    reminderId: v.id("workoutReminders"),
    scheduleVersion: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.reminderId);
    if (
      !reminder ||
      reminder.enabled !== true ||
      reminder.scheduleVersion !== args.scheduleVersion
    ) {
      return;
    }

    if (args.error) {
      await ctx.db.patch(reminder._id, {
        enabled: false,
        scheduleVersion: args.scheduleVersion + 1,
        lastError: args.error,
      });
      return;
    }

    await ctx.db.patch(reminder._id, {
      lastSentAt: Date.now(),
      lastError: undefined,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.reminders.scheduleNextReminder,
      { reminderId: reminder._id, scheduleVersion: args.scheduleVersion },
    );
  },
});

export const deliverReminder = internalAction({
  args: {
    reminderId: v.id("workoutReminders"),
    scheduleVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const details = await ctx.runQuery(
      internal.reminders.getReminderDeliveryDetails,
      args,
    );
    if (!details) return;

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.REMINDER_FROM_EMAIL;
    const appUrl = process.env.APP_URL;
    if (!apiKey || !fromEmail || !appUrl) {
      await ctx.runMutation(internal.reminders.completeReminderDelivery, {
        ...args,
        error: "Email reminder delivery is not configured.",
      });
      console.error("Reminder delivery disabled: email provider configuration is missing.");
      return;
    }

    const appOrigin = validatedAppUrl(appUrl);
    const unsubscribeUrl = `${appOrigin}/unsubscribe?token=${encodeURIComponent(details.unsubscribeToken)}`;
    const oneClickUnsubscribeUrl = `${appOrigin}/api/unsubscribe?token=${encodeURIComponent(details.unsubscribeToken)}`;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "List-Unsubscribe": `<${oneClickUnsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [details.email],
          subject: "Your scheduled workout reminder",
          html: `<p>This is your opted-in reminder for a scheduled workout day.</p><p>Open your plan in Fitness Buddy AI and follow the pace that is appropriate for you.</p><p><a href="${unsubscribeUrl}">Unsubscribe from workout reminders</a></p>`,
        }),
      });
      if (!response.ok) {
        const providerMessage = await response.text();
        throw new Error(
          `Email provider returned ${response.status}: ${providerMessage.slice(0, 300)}`,
        );
      }
      await ctx.runMutation(internal.reminders.completeReminderDelivery, args);
    } catch (error) {
      console.error("Workout reminder email delivery failed.", error);
      await ctx.runMutation(internal.reminders.completeReminderDelivery, {
        ...args,
        error: "Email delivery failed. Review your email settings and opt in again.",
      });
    }
  },
});

export const unsubscribe = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw new Error("This unsubscribe link is invalid.");
    }
    const reminder = await ctx.db
      .query("workoutReminders")
      .withIndex("by_unsubscribe_token", (q) =>
        q.eq("unsubscribeToken", token),
      )
      .first();
    if (!reminder) {
      throw new Error("This reminder could not be found. It may already be removed.");
    }
    if (reminder.enabled) {
      await ctx.db.patch(reminder._id, {
        enabled: false,
        scheduleVersion:
          (typeof reminder.scheduleVersion === "number"
            ? reminder.scheduleVersion
            : 0) + 1,
        unsubscribedAt: Date.now(),
        lastError: undefined,
      });
    }
    return { unsubscribed: true };
  },
});
