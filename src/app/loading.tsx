export default function Loading() {
  return (
    <main className="container mx-auto flex min-h-[40vh] items-center justify-center px-4">
      <p role="status" className="animate-pulse text-muted-foreground">
        Loading...
      </p>
    </main>
  );
}
