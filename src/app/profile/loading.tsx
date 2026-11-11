export default function ProfileLoading() {
  return (
    <section className="container mx-auto max-w-5xl px-4 py-16">
      <div className="h-36 animate-pulse rounded-lg border border-border bg-card/60" />
      <div className="mt-8 h-20 animate-pulse rounded-lg border border-border bg-card/60" />
      <p role="status" className="mt-4 text-center text-muted-foreground">
        Loading your profile...
      </p>
    </section>
  );
}
