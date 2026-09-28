export type TraditionalGender = "female" | "male" | "nonbinary" | "prefer-not-to-say";

export interface BirthPlace {
  id: string;
  label: string;
  city: string;
  admin1?: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  source: "open-meteo" | "sample-default";
}

export interface BirthProfileInput {
  displayName: string;
  birthDate: string;
  birthTime: string | null;
  timeAccuracy: "known" | "unknown";
  birthPlace: BirthPlace;
  traditionalGender: TraditionalGender;
}

export const defaultBirthPlace: BirthPlace = {
  id: "sample:shanghai",
  label: "Shanghai, China",
  city: "Shanghai",
  country: "China",
  countryCode: "CN",
  latitude: 31.2304,
  longitude: 121.4737,
  timeZone: "Asia/Shanghai",
  source: "sample-default",
};

export function isBirthPlace(value: unknown): value is BirthPlace {
  if (!value || typeof value !== "object") return false;
  const place = value as Partial<BirthPlace>;
  return (
    typeof place.id === "string" && place.id.length > 0 &&
    typeof place.label === "string" && place.label.length > 0 &&
    typeof place.city === "string" && place.city.length > 0 &&
    typeof place.country === "string" && place.country.length > 0 &&
    typeof place.countryCode === "string" && /^[A-Z]{2}$/.test(place.countryCode) &&
    typeof place.latitude === "number" && Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90 &&
    typeof place.longitude === "number" && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180 &&
    typeof place.timeZone === "string" && isTimeZone(place.timeZone) &&
    (place.source === "open-meteo" || place.source === "sample-default")
  );
}

function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}
