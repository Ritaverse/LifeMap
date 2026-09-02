import assert from "node:assert/strict";
import test from "node:test";
import { readBirthProfile, readOnboardingDraft } from "../app/lib/profile-storage.ts";

function createSessionStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
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
