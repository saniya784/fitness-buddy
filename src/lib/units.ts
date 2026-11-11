export type UnitPreference = "metric" | "imperial";

export function heightToCentimeters(value: number, units: UnitPreference) {
  return Number((units === "imperial" ? value * 2.54 : value).toFixed(2));
}

export function weightToKilograms(value: number, units: UnitPreference) {
  return Number((units === "imperial" ? value * 0.45359237 : value).toFixed(2));
}

export function formatHeight(heightCm: number, units: UnitPreference) {
  if (units === "metric") return `${heightCm} cm`;
  const totalInches = Math.round(heightCm / 2.54);
  return `${Math.floor(totalInches / 12)} ft ${totalInches % 12} in`;
}

export function formatWeight(weightKg: number, units: UnitPreference) {
  return units === "metric"
    ? `${weightKg} kg`
    : `${(weightKg * 2.20462262).toFixed(1)} lb`;
}
