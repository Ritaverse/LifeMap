import assert from "node:assert/strict";
import test from "node:test";
import { BAZI_ENGINE, calculateBazi, demoBirthProfile, isBirthPlace } from "../app/lib/bazi.ts";

test("BaZi engine returns a stable known Four Pillars result", () => {
  const first = calculateBazi(demoBirthProfile);
  const second = calculateBazi(demoBirthProfile);

  assert.deepEqual(second, first);
  assert.equal(first.engine.version, BAZI_ENGINE.version);
  assert.deepEqual(
    [first.pillars.year.ganZhi, first.pillars.month.ganZhi, first.pillars.day.ganZhi, first.pillars.time?.ganZhi],
    ["庚午", "壬午", "癸丑", "丁巳"],
  );
  assert.deepEqual(first.dayMaster, { stem: "癸", element: "水", polarity: "阴" });
  assert.deepEqual(first.visibleElementCounts, { 木: 0, 火: 4, 土: 1, 金: 1, 水: 2 });
});

test("unknown birth time produces an explicit provisional three-pillar result", () => {
  const reading = calculateBazi({ ...demoBirthProfile, birthTime: null, timeAccuracy: "unknown" });

  assert.equal(reading.completeness, "three-pillars-provisional");
  assert.equal(reading.pillars.time, null);
  assert.equal(Object.values(reading.visibleElementCounts).reduce((sum, count) => sum + count, 0), 6);
  assert.match(reading.caveats.join(" "), /出生时间未知/);
});

test("the published convention changes the day pillar at local midnight", () => {
  const beforeMidnight = calculateBazi({ ...demoBirthProfile, birthTime: "23:30" });
  const afterMidnight = calculateBazi({ ...demoBirthProfile, birthDate: "1990-06-18", birthTime: "00:30" });

  assert.equal(beforeMidnight.conventions.dayBoundary, "00:00 local civil time");
  assert.equal(beforeMidnight.pillars.day.ganZhi, "癸丑");
  assert.equal(afterMidnight.pillars.day.ganZhi, "甲寅");
});

test("invalid calendar input is rejected before chart calculation", () => {
  assert.throws(() => calculateBazi({ ...demoBirthProfile, birthDate: "1990-02-31" }), /Birth date/);
});

test("Li Chun changes both the year and month pillars at the engine boundary", () => {
  const beforeLiChun = calculateBazi({ ...demoBirthProfile, birthDate: "1990-02-04", birthTime: "10:13" });
  const atLiChun = calculateBazi({ ...demoBirthProfile, birthDate: "1990-02-04", birthTime: "10:14" });

  assert.deepEqual(
    [beforeLiChun.pillars.year.ganZhi, beforeLiChun.pillars.month.ganZhi],
    ["己巳", "丁丑"],
  );
  assert.deepEqual(
    [atLiChun.pillars.year.ganZhi, atLiChun.pillars.month.ganZhi],
    ["庚午", "戊寅"],
  );
});

test("known birth times are validated strictly", () => {
  for (const birthTime of [null, "9:32", "24:00", "12:60", "not-a-time"]) {
    assert.throws(
      () => calculateBazi({ ...demoBirthProfile, birthTime, timeAccuracy: "known" }),
      /Birth time/,
      String(birthTime),
    );
  }
});

test("unknown birth time ignores stale time text and remains deterministic", () => {
  const withEmptyTime = calculateBazi({ ...demoBirthProfile, birthTime: null, timeAccuracy: "unknown" });
  const withStaleTime = calculateBazi({ ...demoBirthProfile, birthTime: "not-a-time", timeAccuracy: "unknown" });

  assert.deepEqual(withStaleTime.pillars, withEmptyTime.pillars);
  assert.deepEqual(withStaleTime.dayMaster, withEmptyTime.dayMaster);
  assert.deepEqual(withStaleTime.visibleElementCounts, withEmptyTime.visibleElementCounts);
  assert.equal(withStaleTime.pillars.time, null);
});

test("calculation rejects missing names, unsupported dates, and invalid places", () => {
  assert.throws(() => calculateBazi({ ...demoBirthProfile, displayName: "   " }), /Display name/);
  assert.throws(() => calculateBazi({ ...demoBirthProfile, birthDate: "1899-12-31" }), /supported range/);
  assert.throws(() => calculateBazi({ ...demoBirthProfile, birthDate: "2101-01-01" }), /supported range/);
  assert.throws(() => calculateBazi({
    ...demoBirthProfile,
    birthPlace: { ...demoBirthProfile.birthPlace, timeZone: "Not/A-Timezone" },
  }), /Birthplace/);
});

test("birthplace validation enforces coordinates, country codes, and IANA timezones", () => {
  assert.equal(isBirthPlace(demoBirthProfile.birthPlace), true);
  assert.equal(isBirthPlace({ ...demoBirthProfile.birthPlace, latitude: 90.01 }), false);
  assert.equal(isBirthPlace({ ...demoBirthProfile.birthPlace, longitude: -180.01 }), false);
  assert.equal(isBirthPlace({ ...demoBirthProfile.birthPlace, countryCode: "CHN" }), false);
  assert.equal(isBirthPlace({ ...demoBirthProfile.birthPlace, timeZone: "Pacific/Atlantis" }), false);
  assert.equal(isBirthPlace(null), false);
});

test("calculation trims the display name without mutating its input", () => {
  const profile = { ...demoBirthProfile, displayName: "  Yu  " };
  const reading = calculateBazi(profile);

  assert.equal(profile.displayName, "  Yu  ");
  assert.equal(reading.profile.displayName, "Yu");
  assert.equal(Object.values(reading.visibleElementCounts).reduce((sum, count) => sum + count, 0), 8);
  for (const pillar of Object.values(reading.pillars)) {
    assert.equal(pillar.hiddenStems.length, pillar.hiddenTenGods.length);
  }
});
