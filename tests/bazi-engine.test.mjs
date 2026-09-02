import assert from "node:assert/strict";
import test from "node:test";
import { BAZI_ENGINE, calculateBazi, demoBirthProfile } from "../app/lib/bazi.ts";

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
