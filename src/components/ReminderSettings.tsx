"use client";

import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";

type Plan = Doc<"plans">;
const EMPTY_SCHEDULE: string[] = [];

export default function ReminderSettings({ plan }: { plan: Plan }) {
  const reminder = useQuery(api.reminders.getReminder, {});
  const configure = useAction(api.reminders.configureReminder);
  const schedule = plan.workoutPlan?.schedule ?? EMPTY_SCHEDULE;
  const [days, setDays] = useState<string[]>([]);
  const [time, setTime] = useState("09:00");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (reminder === undefined) return;
    if (reminder?.planId === plan._id) {
      setDays(reminder.days.filter((day) => schedule.includes(day)));
      setTime(
        `${String(reminder.hourUtc).padStart(2, "0")}:${String(reminder.minuteUtc).padStart(2, "0")}`,
      );
      setEnabled(reminder.enabled);
    } else {
      setDays([...schedule]);
      setTime("09:00");
      setEnabled(false);
    }
  }, [reminder, plan._id, schedule]);

  function toggleDay(day: string) {
    setDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day],
    );
  }

  async function save() {
    const [hour, minute] = time.split(":").map(Number);
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await configure({
        planId: plan._id,
        days,
        hourUtc: hour,
        minuteUtc: minute,
        enabled,
      });
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Reminder settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="no-print space-y-4 rounded-lg border border-border bg-card/60 p-5">
      <div>
        <h3 className="text-lg font-semibold">Workout email reminders</h3>
        <p className="text-sm text-muted-foreground">
          Optional recurring email for this active plan. The time below uses UTC.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {schedule.map((day) => (
          <label key={day} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={days.includes(day)}
              onChange={() => toggleDay(day)}
            />
            {day}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="grid gap-1 text-sm">
          Reminder time (UTC)
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.currentTarget.value)}
            className="rounded border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.currentTarget.checked)}
          />
          I opt in to workout reminder emails
        </label>
        <Button disabled={busy || reminder === undefined} onClick={() => void save()}>
          {busy ? "Saving…" : "Save reminder"}
        </Button>
      </div>
      {reminder?.planId === plan._id && reminder.nextSendAt && reminder.enabled && (
        <p className="text-xs text-muted-foreground">
          Next reminder: {new Date(reminder.nextSendAt).toLocaleString()} (your browser’s local time)
        </p>
      )}
      {reminder?.lastError && (
        <p role="status" className="text-sm text-muted-foreground">{reminder.lastError}</p>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {saved && <p role="status" className="text-sm text-primary">Reminder preference saved.</p>}
    </section>
  );
}
