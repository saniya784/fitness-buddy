"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Vapi from "@vapi-ai/web";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getVapi, getVapiAssistantId } from "@/lib/vapi";
import "@/styles/animations.css";

interface TranscriptMessage {
  content: string;
  role: "assistant" | "user";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function describeCallError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (isRecord(error) && typeof error.name === "string") {
    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError" ||
      error.name === "SecurityError" ||
      /microphone|permission|not allowed/i.test(message)
    ) {
      return "Microphone access was denied. Allow microphone access in your browser settings and try again.";
    }
  }
  if (message) return message;
  return "The voice call couldn't be started. Please try again or use the form.";
}

export default function GenerateProgramPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const unitPreference = useQuery(
    api.users.getUnitPreference,
    isLoaded && user?.id ? {} : "skip",
  );
  const retryFailedPlan = useMutation(api.plans.retryFailedPlan);
  const authorizeVoiceRequest = useMutation(api.plans.authorizeVoiceRequest);
  const [callActive, setCallActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callError, setCallError] = useState("");
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [generationRequestId, setGenerationRequestId] = useState<string | null>(null);
  const [retryPlanId, setRetryPlanId] = useState<Id<"plans"> | null>(null);
  const [generationTimedOut, setGenerationTimedOut] = useState(false);
  const [generationNotFound, setGenerationNotFound] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [medicalDisclaimerAccepted, setMedicalDisclaimerAccepted] =
    useState(false);
  const vapiRef = useRef<Vapi | null>(null);
  const listenersAttached = useRef(false);
  const connectingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  const voicePlan = useQuery(
    api.plans.getPlanForRequest,
    generationRequestId ? { requestId: generationRequestId } : "skip",
  );
  const retriedPlan = useQuery(
    api.plans.getPlan,
    retryPlanId ? { planId: retryPlanId } : "skip",
  );
  const trackedPlan = retryPlanId ? retriedPlan : voicePlan;

  const clearConnectingTimer = useCallback(() => {
    if (connectingTimer.current) {
      clearTimeout(connectingTimer.current);
      connectingTimer.current = null;
    }
  }, []);

  const handleCallStart = useCallback(() => {
    clearConnectingTimer();
    setConnecting(false);
    setCallActive(true);
    setCallEnded(false);
  }, [clearConnectingTimer]);

  const handleCallEnd = useCallback(() => {
    clearConnectingTimer();
    setCallActive(false);
    setConnecting(false);
    setIsSpeaking(false);
    setCallEnded(true);
  }, [clearConnectingTimer]);

  const handleSpeechStart = useCallback(() => setIsSpeaking(true), []);
  const handleSpeechEnd = useCallback(() => setIsSpeaking(false), []);

  const handleMessage = useCallback((payload: unknown) => {
    if (!isRecord(payload)) return;
    const message = isRecord(payload.message) ? payload.message : payload;
    const transcript = message.transcript;
    const role = message.role;
    if (
      message.type !== "transcript" ||
      message.transcriptType !== "final" ||
      typeof transcript !== "string" ||
      (role !== "assistant" && role !== "user")
    ) {
      return;
    }
    setMessages((current) => [
      ...current,
      { content: transcript, role },
    ]);
  }, []);

  const handleVapiError = useCallback(
    (error: Error) => {
      let text = error instanceof Error ? error.message : "";
      try {
        text += ` ${JSON.stringify(error)}`;
      } catch {
        // ignore values that cannot be serialised
      }
      // Vapi reports a normal hang-up as an "ejection" error.
      if (/ejection|meeting has ended/i.test(text)) {
        handleCallEnd();
        return;
      }
      clearConnectingTimer();
      setConnecting(false);
      setCallActive(false);
      setCallError(describeCallError(error));
    },
    [clearConnectingTimer, handleCallEnd],
  );

  const attachListeners = useCallback(
    (client: Vapi) => {
      if (listenersAttached.current) return;
      client
        .on("call-start", handleCallStart)
        .on("call-end", handleCallEnd)
        .on("speech-start", handleSpeechStart)
        .on("speech-end", handleSpeechEnd)
        .on("message", handleMessage)
        .on("error", handleVapiError);
      listenersAttached.current = true;
    },
    [
      handleCallEnd,
      handleCallStart,
      handleMessage,
      handleSpeechEnd,
      handleSpeechStart,
      handleVapiError,
    ],
  );

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (trackedPlan?.status === "ready") {
      const redirectTimer = setTimeout(() => router.push("/profile"), 1200);
      return () => clearTimeout(redirectTimer);
    }
  }, [router, trackedPlan?.status]);

  useEffect(() => {
    if (!callActive || !trackedPlan) return;
    // Plan request received: hang up shortly so no more call credit is used.
    // The short pause lets the assistant finish a one-line goodbye.
    const timer = setTimeout(() => vapiRef.current?.stop(), 4000);
    return () => clearTimeout(timer);
  }, [callActive, trackedPlan]);

  useEffect(() => {
    if (!callEnded || !generationRequestId || trackedPlan) return;
    const timer = setTimeout(() => setGenerationNotFound(true), 20_000);
    return () => clearTimeout(timer);
  }, [callEnded, generationRequestId, trackedPlan]);

  useEffect(() => {
    if (!callEnded || trackedPlan?.status !== "pending") return;
    const timer = setTimeout(() => setGenerationTimedOut(true), 120_000);
    return () => clearTimeout(timer);
  }, [callEnded, trackedPlan?.status]);

  useEffect(
    () => () => {
      clearConnectingTimer();
      const client = vapiRef.current;
      if (!client || !listenersAttached.current) return;
      client
        .off("call-start", handleCallStart)
        .off("call-end", handleCallEnd)
        .off("speech-start", handleSpeechStart)
        .off("speech-end", handleSpeechEnd)
        .off("message", handleMessage)
        .off("error", handleVapiError);
      listenersAttached.current = false;
    },
    [
      clearConnectingTimer,
      handleCallEnd,
      handleCallStart,
      handleMessage,
      handleSpeechEnd,
      handleSpeechStart,
      handleVapiError,
    ],
  );

  useEffect(
    () => () => {
      vapiRef.current?.stop();
    },
    [],
  );

  async function toggleCall() {
    if (callActive) {
      vapiRef.current?.stop();
      return;
    }
    if (!isLoaded || !user?.id) {
      setCallError("Your account is still loading. Please try again in a moment.");
      return;
    }

    setCallError("");
    setMessages([]);
    setCallEnded(false);
    setGenerationTimedOut(false);
    setGenerationNotFound(false);
    setRetryPlanId(null);
    const requestId = globalThis.crypto.randomUUID();
    setGenerationRequestId(requestId);
    setConnecting(true);

    try {
      const [client, assistantId] = await Promise.all([
        getVapi(),
        Promise.resolve(getVapiAssistantId()),
      ]);
      vapiRef.current = client;
      attachListeners(client);
      await authorizeVoiceRequest({
        requestId,
        consentAccepted: medicalDisclaimerAccepted,
      });

      connectingTimer.current = setTimeout(() => {
        setConnecting(false);
        setCallError(
          "The call timed out before connecting. Check your microphone permission and network, then retry.",
        );
        client.stop();
      }, 30_000);

      const call = await client.start(assistantId, {
        variableValues: {
          full_name: user.fullName ?? "There",
          user_id: user.id,
          unit_preference: unitPreference ?? "metric",
          generation_id: requestId,
        },
      });
      if (!call) {
        clearConnectingTimer();
        setConnecting(false);
        setCallError("The voice service did not start a call. Please try again.");
      }
    } catch (error) {
      clearConnectingTimer();
      setConnecting(false);
      setCallError(describeCallError(error));
    }
  }

  async function retryGeneration() {
    if (!trackedPlan || trackedPlan.status !== "failed") return;
    setRetrying(true);
    setCallError("");
    try {
      const planId = await retryFailedPlan({ planId: trackedPlan._id });
      setRetryPlanId(planId);
      setGenerationTimedOut(false);
      setGenerationNotFound(false);
    } catch (error) {
      setCallError(
        error instanceof Error ? error.message : "The plan couldn't be retried.",
      );
    } finally {
      setRetrying(false);
    }
  }

  return (
    <section className="container mx-auto max-w-5xl px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold font-mono">
          <span>Generate Your </span>
          <span className="text-primary uppercase">Fitness Program</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Talk to your AI coach or use the{" "}
          <Link className="text-primary underline" href="/generate-program/form">
            form generator
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex min-h-72 flex-col items-center justify-center bg-card/90 p-8 text-center">
          <div className="relative mb-4 size-32 overflow-hidden rounded-full border border-border">
            <Image
              src="/ai-avatar.png"
              alt="AI fitness coach"
              fill
              className="object-cover"
            />
          </div>
          <h2 className="text-xl font-bold">FITNESS BUDDY AI</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSpeaking
              ? "Speaking..."
              : callActive
                ? "Listening..."
                : connecting
                  ? "Connecting..."
                  : "Ready when you are"}
          </p>
        </Card>

        <Card className="flex min-h-72 flex-col items-center justify-center bg-card/90 p-8 text-center">
          {user?.imageUrl && (
            <div className="relative mb-4 size-32 overflow-hidden rounded-full">
              <Image src={user.imageUrl} alt="Your profile" fill className="object-cover" />
            </div>
          )}
          <h2 className="text-xl font-bold">You</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {user?.fullName ?? "Sign in to start"}
          </p>
        </Card>
      </div>

      {messages.length > 0 && (
        <div
          ref={messageContainerRef}
          className="mt-6 h-56 space-y-3 overflow-y-auto rounded-lg border border-border bg-card/80 p-4"
          role="log"
          aria-label="Voice conversation transcript"
          aria-live="polite"
          aria-relevant="additions text"
          aria-atomic="false"
        >
          {messages.map((message, index) => (
            <p key={`${index}-${message.role}`} className="text-sm">
              <strong className="mr-2 text-primary">
                {message.role === "assistant" ? "COACH" : "YOU"}
              </strong>
              {message.content}
            </p>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col items-center gap-4">
        {!callActive && !callEnded && (
          <label className="flex max-w-2xl items-start gap-3 rounded-lg border border-border bg-card/80 p-4 text-sm">
            <input
              type="checkbox"
              checked={medicalDisclaimerAccepted}
              onChange={(event) =>
                setMedicalDisclaimerAccepted(event.currentTarget.checked)
              }
              className="mt-1 size-4 accent-primary"
            />
            <span>
              I understand this plan is educational and not medical advice. I
              will consult a qualified healthcare professional before changing
              my exercise or diet, especially if I have a health concern.
            </span>
          </label>
        )}
        {callEnded && (
          <div className="w-full max-w-xl rounded-lg border border-border bg-card/80 p-4 text-center">
            {!trackedPlan && !generationNotFound && (
              <p role="status">Waiting for your plan request to reach the generator...</p>
            )}
            {generationNotFound && !trackedPlan && (
              <p role="alert">
                No plan request was received. Try again or use the form generator.
              </p>
            )}
            {trackedPlan?.status === "pending" && (
              <p role="status">
                {generationTimedOut
                  ? "Generation is taking longer than expected. We are still checking for updates."
                  : "Your plan is generating. This page will update automatically."}
              </p>
            )}
            {trackedPlan?.status === "ready" && (
              <p role="status">Your plan is ready. Opening your profile...</p>
            )}
            {trackedPlan?.status === "failed" && (
              <div className="space-y-3">
                <p role="alert" className="text-destructive">
                  {trackedPlan.failureReason ?? "Your plan could not be generated."}
                </p>
                <Button disabled={retrying} onClick={retryGeneration}>
                  {retrying ? "Queueing retry..." : "Retry generation"}
                </Button>
              </div>
            )}
          </div>
        )}

        {callError && (
          <p role="alert" className="max-w-xl text-center text-sm text-destructive">
            {callError}
          </p>
        )}

        <Button
          className="w-44 rounded-3xl"
          onClick={toggleCall}
          disabled={
            connecting ||
            !isLoaded ||
            !user ||
            (!callActive && !medicalDisclaimerAccepted)
          }
          variant={callActive ? "destructive" : "default"}
        >
          {callActive ? "End Call" : connecting ? "Connecting..." : "Start Call"}
        </Button>
      </div>
    </section>
  );
}