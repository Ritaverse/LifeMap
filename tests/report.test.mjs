import assert from "node:assert/strict";
import test from "node:test";
import { calculateBazi, demoBaziReading } from "../app/lib/bazi.ts";
import { buildCalculatedExperience } from "../app/lib/experience.ts";
import { buildDailyReport, buildLifeMapReport } from "../app/lib/report.ts";

test("daily report is one dated, evidence-grounded page", () => {
  const experience = buildCalculatedExperience(demoBaziReading, "2026-09-19");
  const report = buildDailyReport(experience, "2026-09-19");
  assert.equal(report.pages.length, 1);
  assert.equal(report.pages[0].id, "daily");
  assert.match(report.pages[0].title, /2026-09-19/);
  assert.ok(report.pages[0].blocks.some((block) => block.kind === "calculated-fact"));
  assert.ok(report.pages[0].blocks.some((block) => block.kind === "traditional-reflection"));
  assert.ok(report.pages[0].blocks.some((block) => block.kind === "practice"));
  assert.match(JSON.stringify(report), /EVIDENCE/);
  assert.match(report.disclaimer, /不是科学预测/);
});

test("full report is deterministic, multi-page, and fact-labelled", () => {
  const experience = buildCalculatedExperience(demoBaziReading, "2026-09-19");
  const first = buildLifeMapReport(experience, "2026-09-19");
  const second = buildLifeMapReport(experience, "2026-09-19");
  assert.deepEqual(first, second);
  assert.equal(first.pages.length, 10);
  assert.deepEqual(first.pages.map((page) => page.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(first.pages.flatMap((page) => page.blocks).some((block) => block.kind === "calculated-fact"));
  assert.ok(first.pages.flatMap((page) => page.blocks).some((block) => block.kind === "traditional-reflection"));
  assert.match(JSON.stringify(first), /紫微十二宫/);
  assert.match(JSON.stringify(first), /西方本命盘/);
  assert.match(JSON.stringify(first), /CURRENT FACT/);
  assert.match(JSON.stringify(first), /RULE SYNTHESIS/);
  assert.match(first.disclaimer, /不是科学预测/);
});

test("report records engine limits and unknown-time boundaries", () => {
  const provisional = calculateBazi({ ...demoBaziReading.profile, birthTime: null, timeAccuracy: "unknown" });
  const experience = buildCalculatedExperience(provisional, "2026-09-19");
  const report = buildLifeMapReport(experience, "2026-09-19");
  const text = JSON.stringify(report);
  assert.match(text, /出生时间未知/);
  assert.match(text, /时柱/);
  assert.match(text, /不推算/);
  assert.match(text, /life-map\.bazi\.v1/);
  assert.match(text, /上升点/);
});

test("report rejects unstable date formats", () => {
  const experience = buildCalculatedExperience(demoBaziReading, "2026-09-19");
  assert.throws(() => buildLifeMapReport(experience, "09/19/2026"), /YYYY-MM-DD/);
});
