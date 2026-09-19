import assert from "node:assert/strict";
import test from "node:test";
import { demoBirthProfile } from "../app/lib/bazi.ts";
import {
  clearBirthProfile,
  readBirthProfile,
  readOnboardingDraft,
  writeBirthProfile,
  writeOnboardingDraft,
} from "../app/lib/profile-storage.ts";

function createSessionStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  };
}

test("the previous fixed-place profile migrates into the dynamic place model", () => {
  globalThis.sessionStorage = createSessionStorage();
  sessionStorage.setItem("life-map-birth-profile-v1", JSON.stringify({
    displayName: "Yu",
    birthDate: "1990-06-17",
    birthTime: "09:32",
    timeAccuracy: "known",
    placeId: "los-angeles",
    traditionalGender: "prefer-not-to-say",
  }));

  const profile = readBirthProfile();
  assert.equal(profile?.birthPlace.label, "Los Angeles, United States");
  assert.equal(profile?.birthPlace.timeZone, "America/Los_Angeles");
});

test("the previous onboarding draft preserves its selected location", () => {
  globalThis.sessionStorage = createSessionStorage();
  sessionStorage.setItem("life-map-onboarding", JSON.stringify({
    name: "Yu",
    date: "1990-06-17",
    time: "09:32",
    unknownTime: false,
    location: "Taipei, Taiwan",
    gender: "prefer-not-to-say",
    consent: true,
  }));
  const fallback = { name: "", date: "", time: "", unknownTime: false, locationQuery: "", selectedPlace: null, gender: "prefer-not-to-say", consent: false };

  const draft = readOnboardingDraft(fallback);
  assert.equal(draft.selectedPlace?.label, "Taipei, Taiwan");
  assert.equal(draft.locationQuery, "Taipei, Taiwan");
  assert.equal(draft.consent, true);
});

test("birth profiles round-trip through session storage", () => {
  globalThis.sessionStorage = createSessionStorage();

  writeBirthProfile(demoBirthProfile);

  assert.deepEqual(readBirthProfile(), demoBirthProfile);
});

test("malformed or invalid stored profiles are rejected", () => {
  globalThis.sessionStorage = createSessionStorage();
  sessionStorage.setItem("life-map-birth-profile-v1", "not json");
  assert.equal(readBirthProfile(), null);

  sessionStorage.setItem("life-map-birth-profile-v1", JSON.stringify({
    ...demoBirthProfile,
    birthPlace: { ...demoBirthProfile.birthPlace, latitude: 200 },
  }));
  assert.equal(readBirthProfile(), null);

  sessionStorage.setItem("life-map-birth-profile-v1", JSON.stringify({
    ...demoBirthProfile,
    traditionalGender: "invalid",
  }));
  assert.equal(readBirthProfile(), null);
});

test("partial onboarding drafts use safe field-level fallbacks", () => {
  globalThis.sessionStorage = createSessionStorage();
  sessionStorage.setItem("life-map-onboarding", JSON.stringify({
    name: "Lin",
    unknownTime: true,
    selectedPlace: { ...demoBirthProfile.birthPlace, timeZone: "invalid" },
    consent: "yes",
  }));
  const fallback = {
    name: "Yu",
    date: "1990-06-17",
    time: "09:32",
    unknownTime: false,
    locationQuery: "Shanghai, China",
    selectedPlace: demoBirthProfile.birthPlace,
    gender: "prefer-not-to-say",
    consent: false,
  };

  assert.deepEqual(readOnboardingDraft(fallback), {
    ...fallback,
    name: "Lin",
    unknownTime: true,
  });
});

test("onboarding drafts round-trip and clearing removes all session markers", () => {
  globalThis.sessionStorage = createSessionStorage();
  const draft = {
    name: "Lin",
    date: "2000-02-29",
    time: "",
    unknownTime: true,
    locationQuery: demoBirthProfile.birthPlace.label,
    selectedPlace: demoBirthProfile.birthPlace,
    gender: "nonbinary",
    consent: true,
  };

  writeOnboardingDraft(draft);
  writeBirthProfile({ ...demoBirthProfile, displayName: "Lin" });
  sessionStorage.setItem("life-map-complete", "true");
  assert.deepEqual(readOnboardingDraft(draft), draft);

  clearBirthProfile();
  assert.equal(sessionStorage.has("life-map-birth-profile-v1"), false);
  assert.equal(sessionStorage.has("life-map-onboarding"), false);
  assert.equal(sessionStorage.has("life-map-complete"), false);
});
