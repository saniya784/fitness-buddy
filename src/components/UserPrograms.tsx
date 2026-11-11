import Link from "next/link";
import { AppleIcon, Clock, Dumbbell, ChevronRight, Sparkles } from "lucide-react";
import { SAMPLE_PROGRAMS } from "@/constants";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

export default function UserPrograms() {
  return (
    <section id="program-gallery" className="relative w-full pb-24 pt-16">
      <div className="container mx-auto max-w-6xl px-4">
        <header className="mb-10 rounded-lg border border-border bg-card/90 p-8 text-center">
          <p className="mb-3 text-sm font-mono uppercase tracking-wide text-primary">
            Sample plans
          </p>
          <h2 className="mb-4 text-4xl font-bold">
            Example <span className="text-primary">Programs</span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            These fictional examples show how a plan may be organized. They are
            not plans created for real users and should not be treated as
            individualized advice.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-3">
          {SAMPLE_PROGRAMS.map((program) => (
            <Card
              key={program.id}
              className="overflow-hidden border-border bg-card/90 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between border-b border-border bg-background/70 px-4 py-3">
                <span className="text-sm font-mono text-primary">SAMPLE PLAN</span>
                <span className="text-xs text-muted-foreground">{program.level}</span>
              </div>

              <CardHeader className="px-5 pt-6">
                <CardTitle className="text-xl">{program.title}</CardTitle>
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="size-4 text-primary" />
                  {program.goal}
                </p>
              </CardHeader>

              <CardContent className="space-y-5 px-5">
                <div className="flex items-start gap-3">
                  <Dumbbell className="mt-0.5 size-5 text-primary" />
                  <div>
                    <p className="font-medium">Workout outline</p>
                    <p className="text-sm text-muted-foreground">
                      {program.daysPerWeek} days/week · {program.equipment}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 size-5 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {program.schedule
                      .map((session) => session.duration)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <AppleIcon className="mt-0.5 size-5 text-secondary" />
                  <div>
                    <p className="font-medium">Example meals</p>
                    <p className="text-sm text-muted-foreground">
                      {program.meals.length} meal ideas · no individual calorie
                      target
                    </p>
                  </div>
                </div>
                <p className="border-t border-border pt-4 text-sm text-muted-foreground">
                  {program.description}
                </p>
              </CardContent>

              <CardFooter className="border-t border-border px-5 py-4">
                <Button asChild className="w-full">
                  <Link href={`/programs/${program.id}`}>
                    View sample details
                    <ChevronRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button asChild size="lg">
            <Link href="/generate-program/form">
              Create a plan
              <Sparkles className="ml-2 size-5" />
            </Link>
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Review the health and safety information before generating a plan.
          </p>
        </div>
      </div>
    </section>
  );
}
