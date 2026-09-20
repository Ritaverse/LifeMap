import assert from "node:assert/strict";
import test from "node:test";
import { demoBirthProfile } from "../app/lib/bazi.ts";
import { calculateWestern, calculateWesternTiming, resolveZonedCivilTime } from "../app/lib/western.ts";

test("Western adapter calculates known sample placements, angles, houses, and aspects", () => {
  const reading = calculateWestern(demoBirthProfile);
  const sun = reading.placements.find((placement) => placement.body === "Sun");
  const moon = reading.placements.find((placement) => placement.body === "Moon");
  assert.equal(reading.completeness, "timed-chart");
  assert.equal(reading.utcIso, "1990-06-17T00:32:00.000Z");
  assert.equal(reading.utcOffsetHours, 9);
  assert.deepEqual([sun?.sign, sun?.degree, sun?.house], ["Gemini", 25, 11]);
  assert.deepEqual([moon?.sign, moon?.degree, moon?.house], ["Aries", 6, 9]);
  assert.deepEqual([reading.angles.ascendant?.sign, reading.angles.ascendant?.degree], ["Leo", 12]);
  assert.deepEqual([reading.angles.midheaven?.sign, reading.angles.midheaven?.degree], ["Taurus", 6]);
  assert.equal(reading.houses.length, 12);
  assert.ok(reading.aspects.some((aspect) => aspect.bodyA === "Jupiter" && aspect.bodyB === "Pluto" && aspect.type === "trine"));
});

test("Western adapter omits time-sensitive facts when birth time is unknown", () => {
  const reading = calculateWestern({ ...demoBirthProfile, birthTime: null, timeAccuracy: "unknown" });
  assert.equal(reading.completeness, "date-only-planets");
  assert.equal(reading.angles.ascendant, null);
  assert.equal(reading.houses.length, 0);
  assert.ok(reading.placements.every((placement) => placement.house === null));
});

test("IANA civil-time resolver handles historical offsets, folds, and gaps", () => {
  const shanghai = resolveZonedCivilTime({ year: 1990, month: 6, day: 17, hour: 9, minute: 32, second: 0 }, "Asia/Shanghai");
  assert.equal(shanghai.offsetHours, 9);
  const fold = resolveZonedCivilTime({ year: 2024, month: 11, day: 3, hour: 1, minute: 30, second: 0 }, "America/Los_Angeles");
  assert.equal(fold.ambiguous, true);
  assert.equal(fold.instant.toISOString(), "2024-11-03T08:30:00.000Z");
  assert.throws(
    () => resolveZonedCivilTime({ year: 2024, month: 3, day: 10, hour: 2, minute: 30, second: 0 }, "America/Los_Angeles"),
    /does not exist/,
  );
});

test("Western timing is deterministic for an explicit target date", () => {
  const natal = calculateWestern(demoBirthProfile);
  const first = calculateWesternTiming(demoBirthProfile, natal, "2026-09-20");
  const second = calculateWesternTiming(demoBirthProfile, natal, "2026-09-20");
  assert.deepEqual(first, second);
  assert.equal(first.transits[0].id, "transit-saturn-trine-asc");
  assert.ok(first.transits[0].orb < 0.5);
});
