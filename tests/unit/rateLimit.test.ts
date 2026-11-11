import { describe, expect, it } from "vitest";
import { isRateLimited } from "../../convex/rateLimit";

const INTERVAL_MS = 60_000;

describe("generation rate limit", () => {
  it("allows a first request when no previous timestamp exists", () => {
    expect(isRateLimited(undefined, 100_000, INTERVAL_MS)).toBe(false);
  });

  it("blocks requests inside the configured interval", () => {
    expect(isRateLimited(100_000, 159_999, INTERVAL_MS)).toBe(true);
  });

  it("allows a request when the interval has elapsed", () => {
    expect(isRateLimited(100_000, 160_000, INTERVAL_MS)).toBe(false);
  });

  it("does not treat a corrupt timestamp as an active limit", () => {
    expect(isRateLimited(Number.NaN, 160_000, INTERVAL_MS)).toBe(false);
  });
});
