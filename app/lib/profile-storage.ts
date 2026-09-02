import { defaultBirthPlace, isBirthPlace } from "./bazi.ts";
import type { BirthPlace, BirthProfileInput, TraditionalGender } from "./bazi.ts";

const profileKey = "life-map-birth-profile-v1";
const draftKey = "life-map-onboarding";

export interface OnboardingDraft {
  name: string;
  date: string;
  time: string;
  unknownTime: boolean;
  locationQuery: string;
  selectedPlace: BirthPlace | null;
  gender: TraditionalGender;
  consent: boolean;
}

function isTraditionalGender(value: unknown): value is TraditionalGender {
  return ["female", "male", "nonbinary", "prefer-not-to-say"].includes(String(value));
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

export function readBirthProfile(): BirthProfileInput | null {
  const value = parseJson(sessionStorage.getItem(profileKey));
  if (!value || typeof value !== "object") return null;
  const profile = value as Partial<BirthProfileInput> & { placeId?: string };
  const birthPlace = isBirthPlace(profile.birthPlace) ? profile.birthPlace : legacyPlace(profile.placeId);
  if (
    typeof profile.displayName !== "string" ||
    typeof profile.birthDate !== "string" ||
    !(typeof profile.birthTime === "string" || profile.birthTime === null) ||
    (profile.timeAccuracy !== "known" && profile.timeAccuracy !== "unknown") ||
    !birthPlace ||
    !isTraditionalGender(profile.traditionalGender)
  ) return null;
  return { ...profile, birthPlace } as BirthProfileInput;
}

export function writeBirthProfile(profile: BirthProfileInput) {
  sessionStorage.setItem(profileKey, JSON.stringify(profile));
}

export function clearBirthProfile() {
  sessionStorage.removeItem(profileKey);
  sessionStorage.removeItem(draftKey);
  sessionStorage.removeItem("life-map-complete");
}

export function readOnboardingDraft(fallback: OnboardingDraft): OnboardingDraft {
  const value = parseJson(sessionStorage.getItem(draftKey));
  if (!value || typeof value !== "object") return fallback;
  const draft = value as Partial<OnboardingDraft> & { location?: string; locationId?: string };
  const selectedPlace = isBirthPlace(draft.selectedPlace) ? draft.selectedPlace : legacyPlace(draft.locationId, draft.location) ?? fallback.selectedPlace;
  return {
    name: typeof draft.name === "string" ? draft.name : fallback.name,
    date: typeof draft.date === "string" ? draft.date : fallback.date,
    time: typeof draft.time === "string" ? draft.time : fallback.time,
    unknownTime: typeof draft.unknownTime === "boolean" ? draft.unknownTime : fallback.unknownTime,
    locationQuery: typeof draft.locationQuery === "string" ? draft.locationQuery : selectedPlace?.label ?? fallback.locationQuery,
    selectedPlace,
    gender: isTraditionalGender(draft.gender) ? draft.gender : fallback.gender,
    consent: typeof draft.consent === "boolean" ? draft.consent : false,
  };
}

export function writeOnboardingDraft(draft: OnboardingDraft) {
  sessionStorage.setItem(draftKey, JSON.stringify(draft));
}

function legacyPlace(id?: string, label?: string): BirthPlace | null {
  const key = id ?? label;
  if (!key) return null;
  const places: Record<string, BirthPlace> = {
    shanghai: defaultBirthPlace,
    "Shanghai, China": defaultBirthPlace,
    beijing: { id: "sample:beijing", label: "Beijing, China", city: "Beijing", country: "China", countryCode: "CN", latitude: 39.9042, longitude: 116.4074, timeZone: "Asia/Shanghai", source: "sample-default" },
    "Beijing, China": { id: "sample:beijing", label: "Beijing, China", city: "Beijing", country: "China", countryCode: "CN", latitude: 39.9042, longitude: 116.4074, timeZone: "Asia/Shanghai", source: "sample-default" },
    taipei: { id: "sample:taipei", label: "Taipei, Taiwan", city: "Taipei", country: "Taiwan", countryCode: "TW", latitude: 25.033, longitude: 121.5654, timeZone: "Asia/Taipei", source: "sample-default" },
    "Taipei, Taiwan": { id: "sample:taipei", label: "Taipei, Taiwan", city: "Taipei", country: "Taiwan", countryCode: "TW", latitude: 25.033, longitude: 121.5654, timeZone: "Asia/Taipei", source: "sample-default" },
    "los-angeles": { id: "sample:los-angeles", label: "Los Angeles, United States", city: "Los Angeles", country: "United States", countryCode: "US", latitude: 34.0522, longitude: -118.2437, timeZone: "America/Los_Angeles", source: "sample-default" },
    "Los Angeles, United States": { id: "sample:los-angeles", label: "Los Angeles, United States", city: "Los Angeles", country: "United States", countryCode: "US", latitude: 34.0522, longitude: -118.2437, timeZone: "America/Los_Angeles", source: "sample-default" },
  };
  return places[key] ?? null;
}
