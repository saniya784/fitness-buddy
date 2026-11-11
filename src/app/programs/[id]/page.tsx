import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, Dumbbell } from "lucide-react";
import { SAMPLE_PROGRAMS, MEDICAL_DISCLAIMER } from "@/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { pageMetadata } from "@/lib/metadata";

export function generateStaticParams() {
  return SAMPLE_PROGRAMS.map((program) => ({ id: program.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = SAMPLE_PROGRAMS.find((sample) => sample.id === id);
  if (!program) return pageMetadata("Sample plan", "Fictional sample fitness plan.", `/programs/${id}`);
  return pageMetadata(
    program.title,
    `${program.description} Fictional sample plan for educational purposes.`,
    `/programs/${id}`,
  );
}

export default async function SampleProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = SAMPLE_PROGRAMS.find((sample) => sample.id === id);
  if (!program) notFound();

  return (
    <article className="container mx-auto max-w-4xl px-4 py-12">
      <p className="mb-2 font-mono text-sm uppercase tracking-wide text-primary">
        Fictional sample plan
      </p>
      <h1 className="text-3xl font-bold sm:text-4xl">{program.title}</h1>
      <p className="mt-4 text-muted-foreground">{program.description}</p>

      <aside className="my-8 rounded border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Health and safety:</strong>{" "}
        {MEDICAL_DISCLAIMER}
      </aside>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-4 border-border bg-card/80 p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Dumbbell className="size-5 text-primary" />
            Workout outline
          </h2>
          <p className="text-sm text-muted-foreground">
            {program.level} · {program.goal} · {program.daysPerWeek} days/week
          </p>
          <p className="text-sm text-muted-foreground">
            Equipment: {program.equipment}
          </p>
          <ul className="space-y-3">
            {program.schedule.map((session) => (
              <li
                key={session.day}
                className="rounded border border-border bg-background/50 p-3"
              >
                <p className="font-medium">{session.day}: {session.focus}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" />
                  {session.duration}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="space-y-4 border-border bg-card/80 p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <CalendarDays className="size-5 text-secondary" />
            Example meal ideas
          </h2>
          <p className="text-sm text-muted-foreground">
            Illustrative only; meals are not tailored to an individual.
          </p>
          {program.meals.map((meal) => (
            <section key={meal.name} className="rounded border border-border p-3">
              <h3 className="font-medium">{meal.name}</h3>
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                {meal.foods.map((food) => <li key={food}>{food}</li>)}
              </ul>
            </section>
          ))}
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/generate-program/form">Create a plan</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/#program-gallery">Back to sample plans</Link>
        </Button>
      </div>
    </article>
  );
}
