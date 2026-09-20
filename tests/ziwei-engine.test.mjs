import assert from "node:assert/strict";
import test from "node:test";
import { demoBirthProfile } from "../app/lib/bazi.ts";
import { ZIWEI_ENGINE, calculateZiwei } from "../app/lib/ziwei.ts";

test("Zi Wei adapter produces a versioned deterministic natal chart", () => {
  const first = calculateZiwei(demoBirthProfile, "2026-09-20");
  const second = calculateZiwei(demoBirthProfile, "2026-09-20");
  assert.deepEqual(first, second);
  assert.equal(first.engine.version, ZIWEI_ENGINE.version);
  assert.equal(first.status, "calculated");
  assert.equal(first.completeness, "natal-with-neutral-periods");
  assert.equal(first.soulPalaceBranch, "丑");
  assert.equal(first.bodyPalaceBranch, "亥");
  assert.equal(first.fiveElementsClass, "火六局");
  assert.deepEqual(first.palaces.find((palace) => palace.name === "命宫")?.majorStars.map((star) => star.name), ["紫微", "破军"]);
  assert.ok(first.periods.some((period) => period.scope === "yearly" && period.earthlyBranch === "午"));
  assert.ok(!first.periods.some((period) => period.scope === "decadal"));
});

test("Zi Wei adapter enables direction-dependent periods only with the traditional input", () => {
  const reading = calculateZiwei({ ...demoBirthProfile, traditionalGender: "female" }, "2026-09-20");
  assert.equal(reading.completeness, "natal-and-periods");
  assert.equal(reading.conventions.directionRule, "traditional-gender");
  assert.ok(reading.periods.some((period) => period.scope === "decadal"));
});

test("Zi Wei adapter does not invent palaces when birth time is unknown", () => {
  const reading = calculateZiwei({ ...demoBirthProfile, birthTime: null, timeAccuracy: "unknown" }, "2026-09-20");
  assert.equal(reading.status, "unavailable");
  assert.equal(reading.completeness, "unavailable-unknown-time");
  assert.deepEqual(reading.palaces, []);
  assert.match(reading.caveats[0], /出生时间未知/);
});

