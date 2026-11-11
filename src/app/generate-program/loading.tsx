export default function GenerateProgramLoading() {
  return (
    <section className="container mx-auto max-w-5xl px-4 py-16">
      <div className="mb-8 h-16 animate-pulse rounded-lg bg-card/60" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl border border-border bg-card/60" />
        <div className="h-72 animate-pulse rounded-xl border border-border bg-card/60" />
      </div>
      <p role="status" className="mt-4 text-center text-muted-foreground">
        Loading generator...
      </p>
    </section>
  );
}
