import type { BirthPlaceId, BirthProfileInput, TraditionalGender } from "./bazi";

const profileKey = "life-map-birth-profile-v1";
const draftKey = "life-map-onboarding";

export interface OnboardingDraft {
  name: string;
  date: string;
  time: string;
  unknownTime: boolean;
  locationId: BirthPlaceId;
  gender: TraditionalGender;
  consent: boolean;
}

function isBirthPlaceId(value: unknown): value is BirthPlaceId {
  return ["shanghai", "beijing", "taipei", "los-angeles"].includes(String(value));
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
  const profile = value as Partial<BirthProfileInput>;
  if (
    typeof profile.displayName !== "string" ||
    typeof profile.birthDate !== "string" ||
    !(typeof profile.birthTime === "string" || profile.birthTime === null) ||
    (profile.timeAccuracy !== "known" && profile.timeAccuracy !== "unknown") ||
    !isBirthPlaceId(profile.placeId) ||
    !isTraditionalGender(profile.traditionalGender)
  ) return null;
  return profile as BirthProfileInput;
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
  const draft = value as Partial<OnboardingDraft> & { location?: string };
  const legacyLocations: Record<string, BirthPlaceId> = {
    "Shanghai, China": "shanghai",
    "Beijing, China": "beijing",
    "Taipei, Taiwan": "taipei",
    "Los Angeles, United States": "los-angeles",
  };
  const locationId = isBirthPlaceId(draft.locationId) ? draft.locationId : legacyLocations[draft.location ?? ""] ?? fallback.locationId;
  return {
    name: typeof draft.name === "string" ? draft.name : fallback.name,
    date: typeof draft.date === "string" ? draft.date : fallback.date,
    time: typeof draft.time === "string" ? draft.time : fallback.time,
    unknownTime: typeof draft.unknownTime === "boolean" ? draft.unknownTime : fallback.unknownTime,
    locationId,
    gender: isTraditionalGender(draft.gender) ? draft.gender : fallback.gender,
    consent: typeof draft.consent === "boolean" ? draft.consent : false,
  };
}

export function writeOnboardingDraft(draft: OnboardingDraft) {
  sessionStorage.setItem(draftKey, JSON.stringify(draft));
}
