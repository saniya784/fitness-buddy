import type { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { httpRouter } from "convex/server";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import {
  getGenerationSafetyMessage,
  validateGenerationInput,
} from "./validators";

const http = httpRouter();
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function matchesSharedSecret(provided: string, expected: string) {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const providedBytes = new Uint8Array(providedHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= providedBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("CLERK_WEBHOOK_SECRET environment variable is missing");
    }

    const svixId = request.headers.get("svix-id");
    const svixSignature = request.headers.get("svix-signature");
    const svixTimestamp = request.headers.get("svix-timestamp");

    if (!svixId || !svixSignature || !svixTimestamp) {
      return new Response("No svix headers found", { status: 400 });
    }

    const body = await request.text();
    let evt: WebhookEvent;
    try {
      evt = new Webhook(webhookSecret).verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as WebhookEvent;
    } catch (error) {
      console.error("Failed to verify Clerk webhook.", error);
      return new Response("Invalid webhook signature", { status: 400 });
    }

    if (evt.type === "user.created") {
      const { id, first_name, last_name, image_url, email_addresses } = evt.data;
      const email = email_addresses[0]?.email_address;
      if (!email) return new Response("User email missing", { status: 400 });

      try {
        await ctx.runMutation(api.users.syncUser, {
          email,
          name: `${first_name ?? ""} ${last_name ?? ""}`.trim(),
          image: image_url,
          clerkId: id,
        });
      } catch (error) {
        console.error("Error synchronizing Clerk user.", error);
        return new Response("Error creating user", { status: 500 });
      }
    }

    return new Response("Webhooks processed successfully", { status: 200 });
  }),
});

function getFirstToolCall(payload: JsonRecord): JsonRecord | null {
  const message = isRecord(payload.message) ? payload.message : {};
  const messageToolCalls = Array.isArray(message.toolCallList)
    ? message.toolCallList
    : Array.isArray(message.toolCalls)
      ? message.toolCalls
      : [];
  const nested = Array.isArray(message.toolWithToolCallList)
    ? message.toolWithToolCallList[0]
    : null;
  const nestedCall = isRecord(nested) && isRecord(nested.toolCall)
    ? nested.toolCall
    : null;
  const fallback = Array.isArray(payload.toolCalls)
    ? payload.toolCalls[0]
    : payload.toolCall;
  const candidate =
    messageToolCalls[0] ??
    nestedCall ??
    fallback ??
    null;
  return isRecord(candidate) ? candidate : null;
}

function getToolArguments(toolCall: JsonRecord): JsonRecord {
  const nestedFunction = isRecord(toolCall.function) ? toolCall.function : {};
  const raw = nestedFunction.arguments ?? toolCall.arguments ?? {};
  const parsed = typeof raw === "string" ? JSON.parse(raw) as unknown : raw;
  if (!isRecord(parsed)) throw new Error("Invalid tool arguments.");
  return parsed;
}

function getVariableValues(payload: JsonRecord): JsonRecord {
  const message = isRecord(payload.message) ? payload.message : {};
  const containers: JsonRecord[] = [
    message,
    isRecord(message.artifact) ? message.artifact : {},
    isRecord(message.call) ? message.call : {},
    isRecord(message.call) && isRecord(message.call.artifact)
      ? message.call.artifact
      : {},
    isRecord(message.call) && isRecord(message.call.assistantOverrides)
      ? message.call.assistantOverrides
      : {},
    isRecord(message.assistant) ? message.assistant : {},
    isRecord(message.assistantOverrides) ? message.assistantOverrides : {},
    isRecord(payload.call) ? payload.call : {},
    isRecord(payload.call) && isRecord(payload.call.artifact)
      ? payload.call.artifact
      : {},
    isRecord(payload.call) && isRecord(payload.call.assistantOverrides)
      ? payload.call.assistantOverrides
      : {},
    isRecord(payload.artifact) ? payload.artifact : {},
    payload,
  ];

  for (const container of containers) {
    for (const key of ["variableValues", "variables"]) {
      const candidate = container[key];
      if (isRecord(candidate) && Object.keys(candidate).length > 0) {
        return candidate;
      }
    }
  }
  return {};
}

function firstText(...values: unknown[]): string | undefined {
  return values.find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  )?.trim();
}

function requiredNumber(value: unknown, field: string): number {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(number)) throw new Error(`Missing or invalid ${field}.`);
  return number;
}

function unitFor(value: unknown, defaultUnit: string): string {
  return typeof value === "string" && value.trim()
    ? value.toLowerCase().trim()
    : defaultUnit;
}

function heightInCm(raw: unknown, unit: string): number {
  if (typeof raw === "string") {
    const feetAndInches = raw.match(
      /^\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|')\s*(?:(\d+(?:\.\d+)?)\s*(?:in|inches|")?)?\s*$/i,
    );
    if (feetAndInches) {
      return (
        Number(feetAndInches[1]) * 30.48 +
        Number(feetAndInches[2] ?? 0) * 2.54
      );
    }
    const centimeters = raw.match(/^\s*(\d+(?:\.\d+)?)\s*cm\s*$/i);
    if (centimeters) return Number(centimeters[1]);
  }

  const number = requiredNumber(raw, "height");
  return ["imperial", "in", "inch", "inches"].includes(unit)
    ? number * 2.54
    : number;
}

function weightInKg(raw: unknown, unit: string): number {
  if (typeof raw === "string") {
    const kilograms = raw.match(/^\s*(\d+(?:\.\d+)?)\s*kg\s*$/i);
    if (kilograms) return Number(kilograms[1]);
    const pounds = raw.match(/^\s*(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)\s*$/i);
    if (pounds) return Number(pounds[1]) * 0.45359237;
  }

  const number = requiredNumber(raw, "weight");
  return ["imperial", "lb", "lbs", "pounds"].includes(unit)
    ? number * 0.45359237
    : number;
}

function normalizeLevel(raw: string | undefined): string {
  const value = (raw ?? "").toLowerCase();
  if (/(begin|novice|new|never|starter|basic)/.test(value)) return "beginner";
  if (/(inter|moderate|medium|some experience)/.test(value)) return "intermediate";
  if (/(advanc|expert|experienced|pro)/.test(value)) return "advanced";
  return value;
}

function createGenerationInput(
  args: JsonRecord,
  variables: JsonRecord,
) {
  const unitPreference = unitFor(
    variables.unit_preference ?? variables.unitPreference,
    "metric",
  );
  const heightCm = args.heightCm ?? args.height_cm;
  const weightKg = args.weightKg ?? args.weight_kg;
  const rawHeight = heightCm ?? args.height;
  const rawWeight = weightKg ?? args.weight;
  const age = Math.round(requiredNumber(args.age, "age"));
  const daysPerWeek = Math.round(
    requiredNumber(
      args.daysPerWeek ?? args.workout_days ?? args.workoutDays,
      "workout days",
    ),
  );
  const equipmentValue = args.equipment ?? args.available_equipment;
  const equipment = Array.isArray(equipmentValue)
    ? equipmentValue.filter((item): item is string => typeof item === "string")
    : typeof equipmentValue === "string"
      ? equipmentValue.split(",").map((item) => item.trim()).filter(Boolean)
      : [];

  return {
    age,
    heightCm: heightCm === undefined
      ? heightInCm(
          rawHeight,
          unitFor(args.heightUnit ?? args.height_unit, unitPreference),
        )
      : requiredNumber(heightCm, "height in centimeters"),
    weightKg: weightKg === undefined
      ? weightInKg(
          rawWeight,
          unitFor(args.weightUnit ?? args.weight_unit, unitPreference),
        )
      : requiredNumber(weightKg, "weight in kilograms"),
    goal: firstText(args.goal, args.fitness_goal) ?? "",
    level: normalizeLevel(firstText(args.level, args.fitness_level)),
    daysPerWeek,
    equipment,
    injuries: firstText(args.injuries, args.limitations) ?? "none",
    dietaryRestrictions:
      firstText(
        args.dietaryRestrictions,
        args.dietary_restriction,
        args.dietary_restrictions,
      ) ?? "none",
  };
}

const DIRECT_CALL_ID = "direct-api-request";

function toolResult(toolCallId: string, result: string) {
  if (toolCallId === DIRECT_CALL_ID) {
    return jsonResponse({ result });
  }
  return jsonResponse({
    results: [{ toolCallId, result }],
  });
}

http.route({
  path: "/vapi/generate-program",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const sharedSecret = process.env.VAPI_WEBHOOK_SECRET;
    if (!sharedSecret) {
      console.error("Vapi generation webhook is disabled: VAPI_WEBHOOK_SECRET is missing.");
      return jsonResponse({ error: "Voice generation is temporarily unavailable." }, 503);
    }
    const headerSecret = request.headers.get("x-vapi-secret");
    const secretOk =
      !!headerSecret && (await matchesSharedSecret(headerSecret, sharedSecret));
    if (!secretOk) {
      console.error("Vapi secret check failed: missing or invalid x-vapi-secret header.");
      return jsonResponse({ error: "Unauthorized." }, 401);
    }

    let payloadValue: unknown;
    try {
      payloadValue = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON payload." }, 400);
    }

    if (!isRecord(payloadValue)) {
      return jsonResponse({ error: "Invalid Vapi payload." }, 400);
    }

    let toolCall = getFirstToolCall(payloadValue);
    if (!toolCall) {
      // Vapi "API request" tools post the arguments as a flat JSON body
      // (no toolCallList wrapper). Treat that as a direct tool call.
      const looksLikePlanArgs =
        "age" in payloadValue ||
        "goal" in payloadValue ||
        "daysPerWeek" in payloadValue ||
        "workout_days" in payloadValue;
      if (!looksLikePlanArgs) {
        return jsonResponse({ message: "Handshake verified successfully" });
      }
      toolCall = { id: DIRECT_CALL_ID, arguments: payloadValue };
    }

    const toolCallId = typeof toolCall.id === "string" ? toolCall.id : "";
    if (!toolCallId) {
      return jsonResponse({ error: "Missing tool call ID." }, 400);
    }

    let args: JsonRecord;
    try {
      args = getToolArguments(toolCall);
    } catch {
      return toolResult(toolCallId, "I couldn't read the plan details. Please try again.");
    }

    const variables = getVariableValues(payloadValue);
    const message = isRecord(payloadValue.message) ? payloadValue.message : {};
    const call = isRecord(payloadValue.call) ? payloadValue.call : {};
    const metadata = isRecord(payloadValue.metadata) ? payloadValue.metadata : {};
    let userId = firstText(
      args.user_id,
      args.userId,
      variables.user_id,
      variables.userId,
      variables.clerkId,
      payloadValue.user_id,
      payloadValue.userId,
      message.user_id,
      message.userId,
      isRecord(message.artifact) ? message.artifact.user_id : undefined,
      isRecord(message.artifact) ? message.artifact.userId : undefined,
      isRecord(message.call) && isRecord(message.call.artifact)
        ? message.call.artifact.user_id
        : undefined,
      isRecord(message.call) && isRecord(message.call.artifact)
        ? message.call.artifact.userId
        : undefined,
      metadata.user_id,
      metadata.userId,
      call.user_id,
      call.userId,
      isRecord(call.artifact) ? call.artifact.user_id : undefined,
      isRecord(call.artifact) ? call.artifact.userId : undefined,
    );
    let requestId = firstText(
      args.generation_id,
      args.generationId,
      variables.generation_id,
      variables.generationId,
      isRecord(call.artifact) ? call.artifact.generation_id : undefined,
    );
    // The model can send a wrong or missing user_id / generation_id, so
    // resolve the open voice session server-side and trust its user.
    const openSession = await ctx.runQuery(
      internal.plans.findOpenVoiceRequest,
      { userId, requestId },
    );
    if (openSession) {
      requestId = openSession.requestId;
      userId = openSession.userId;
    }
    if (!requestId) {
      console.error("Vapi webhook: no generation_id found.", {
        payloadKeys: Object.keys(payloadValue),
        messageKeys: Object.keys(message),
        argKeys: Object.keys(args),
        variableKeys: Object.keys(variables),
      });
      return toolResult(
        toolCallId,
        "I couldn't link this request to your open page. Please restart the call.",
      );
    }

    if (!userId) {
      console.error("Vapi webhook: no user id found.", {
        payloadKeys: Object.keys(payloadValue),
        messageKeys: Object.keys(message),
        argKeys: Object.keys(args),
        variableKeys: Object.keys(variables),
      });
      return toolResult(
        toolCallId,
        "I couldn't identify your account. Please sign in again and retry.",
      );
    }

    let input;
    try {
      input = createGenerationInput(args, variables);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Invalid plan details.";
      console.error("Vapi webhook: invalid tool arguments.", reason, Object.keys(args));
      return toolResult(toolCallId, `${reason} Please provide the requested details and try again.`);
    }
    const safetyMessage = getGenerationSafetyMessage(input);
    if (safetyMessage) {
      return toolResult(toolCallId, safetyMessage);
    }
    try {
      validateGenerationInput(input);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Invalid plan details.";
      console.error("Vapi webhook: input failed validation.", reason, input);
      return toolResult(toolCallId, `${reason} Please confirm that detail with the user and call the tool again.`);
    }

    try {
      const planId = await ctx.runMutation(
        internal.plans.createPendingPlan,
        { userId, input, requestId },
      );
      return toolResult(
        toolCallId,
        `Your plan is queued for generation (reference ${planId}).`,
      );
    } catch (error) {
      console.error("Could not queue a voice-generated plan.", error);
      const reason = error instanceof Error ? error.message : "";
      return toolResult(
        toolCallId,
        `Your plan couldn't be queued. ${reason}`.trim(),
      );
    }
  }),
});

export default http;