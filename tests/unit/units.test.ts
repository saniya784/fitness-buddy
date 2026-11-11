import { describe, expect, it } from "vitest";
import {
  formatHeight,
  formatWeight,
  heightToCentimeters,
  weightToKilograms,
} from "../../src/lib/units";

describe("unit conversions", () => {
  it("stores metric height and weight without changing the values", () => {
    expect(heightToCentimeters(175, "metric")).toBe(175);
    expect(weightToKilograms(72.5, "metric")).toBe(72.5);
  });

  it("converts imperial height and weight to metric storage units", () => {
    expect(heightToCentimeters(70, "imperial")).toBe(177.8);
    expect(weightToKilograms(150, "imperial")).toBe(68.04);
  });

  it("formats metric and imperial display values", () => {
    expect(formatHeight(177.8, "imperial")).toBe("5 ft 10 in");
    expect(formatHeight(177.8, "metric")).toBe("177.8 cm");
    expect(formatWeight(68.04, "imperial")).toBe("150.0 lb");
    expect(formatWeight(68.04, "metric")).toBe("68.04 kg");
  });
});
