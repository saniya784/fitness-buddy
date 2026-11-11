import type { ReactNode } from "react";

export function LegalPage({
  title,
  introduction,
  children,
}: {
  title: string;
  introduction: string;
  children: ReactNode;
}) {
  return (
    <article className="container mx-auto max-w-4xl px-4 py-12">
      <header className="mb-10 border-b border-border pb-6">
        <p className="mb-2 font-mono text-sm uppercase tracking-wide text-primary">
          Fitness Buddy AI
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">{introduction}</p>
      </header>
      <div className="space-y-8 leading-7 text-muted-foreground [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-6 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </article>
  );
}

export function LegalReviewNotice() {
  return (
    <p className="mt-10 rounded border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
      These draft terms and privacy notes are general product information, not
      legal advice. Have qualified counsel review them and adapt them to your
      jurisdiction, actual data practices, and service providers before launch.
    </p>
  );
}
