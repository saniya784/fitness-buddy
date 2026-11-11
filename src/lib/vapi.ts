import type Vapi from "@vapi-ai/web";
import { env } from "@/lib/env";

let vapiPromise: Promise<Vapi> | undefined;

export async function getVapi(): Promise<Vapi> {
  if (typeof window === "undefined") {
    throw new Error("Voice calling is only available in the browser.");
  }
  const publicKey = env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("Voice calling is not configured. Use the form generator instead.");
  }

  vapiPromise ??= import("@vapi-ai/web").then(
    ({ default: VapiClient }) => new VapiClient(publicKey),
  );
  return await vapiPromise;
}

export function getVapiAssistantId(): string {
  if (!env.NEXT_PUBLIC_VAPI_ASSISTANT_ID) {
    throw new Error("The voice assistant is not configured. Use the form generator instead.");
  }
  return env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
}
