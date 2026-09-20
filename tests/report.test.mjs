import assert from "node:assert/strict";
import test from "node:test";
import { demoBaziReading } from "../app/lib/bazi.ts";
import { buildLifeMapReport } from "../app/lib/report.ts";

test("full report is deterministic, multi-page, and fact-labelled", () => {
  const first = buildLifeMapReport(demoBaziReading, "2026-09-19");
  const second = buildLifeMapReport(demoBaziReading, "2026-09-19");
  assert.deepEqual(first, second);
  assert.equal(first.pages.length, 8);
  assert.deepEqual(first.pages.map((page) => page.number), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(first.pages.flatMap((page) => page.blocks).some((block) => block.kind === "calculated-fact"));
  assert.ok(first.pages.flatMap((page) => page.blocks).some((block) => block.kind === "traditional-reflection"));
  assert.match(first.disclaimer, /不是科学预测/);
});

test("report records engine limits and unknown-time boundaries", () => {
  const provisional = {
    ...demoBaziReading,
    completeness: "three-pillars-provisional",
    profile: { ...demoBaziReading.profile, birthTime: null, timeAccuracy: "unknown" },
    pillars: { ...demoBaziReading.pillars, time: null },
    caveats: [...demoBaziReading.caveats, "出生时间未知：时柱不显示。"],
  };
  const report = buildLifeMapReport(provisional, "2026-09-19");
  const text = JSON.stringify(report);
  assert.match(text, /出生时间未知/);
  assert.match(text, /时柱/);
  assert.match(text, /不推算/);
  assert.match(text, /life-map\.bazi\.v1/);
});

test("report rejects unstable date formats", () => {
  assert.throws(() => buildLifeMapReport(demoBaziReading, "09/19/2026"), /YYYY-MM-DD/);
});
