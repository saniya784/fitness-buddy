export function isRateLimited(
  lastRequestAt: number | undefined,
  now: number,
  intervalMs: number,
) {
  return (
    lastRequestAt !== undefined &&
    Number.isFinite(lastRequestAt) &&
    now - lastRequestAt < intervalMs
  );
}
