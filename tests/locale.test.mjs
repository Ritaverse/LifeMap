import assert from "node:assert/strict";
import test from "node:test";

import { demoBaziReading } from "../app/lib/bazi.ts";
import { baziCaveatLabel, fiveElementLabel, palaceLabel, pillarLabel, polarityLabel, tenGodLabel, timingLayerLabel } from "../app/lib/chart-terminology.ts";
import { buildCalculatedExperience, routeCalculatedAsk } from "../app/lib/experience.ts";
import { detectInputLocale, detectPreferredLocale, normalizeLocale } from "../app/lib/locale.ts";
import { buildLifeMapReport } from "../app/lib/report.ts";
import { classifySafetyConcern } from "../app/lib/safety.ts";

test("locale normalization supports Chinese and English browser preferences", () => {
  assert.equal(normalizeLocale("zh-Hant-TW"), "zh-CN");
  assert.equal(normalizeLocale("en-US"), "en");
  assert.equal(detectPreferredLocale(["fr-FR", "en-GB"]), "en");
  assert.equal(detectPreferredLocale(["ja-JP", "zh-HK"]), "zh-CN");
});

test("free-text language detection follows clear user input and preserves fallback", () => {
  assert.equal(detectInputLocale("What should I notice in my career?", "zh-CN"), "en");
  assert.equal(detectInputLocale("我现在最需要留意什么？", "en"), "zh-CN");
  assert.equal(detectInputLocale("2026-09-28", "en"), "en");
});

test("canonical Chinese chart terms receive clear English labels", () => {
  assert.equal(fiveElementLabel("水", "en"), "Water (水)");
  assert.equal(polarityLabel("阴", "en"), "Yin (阴)");
  assert.equal(pillarLabel("year", "年柱", "en"), "Year Pillar (年柱)");
  assert.equal(tenGodLabel("正印", "en"), "Direct Resource (正印)");
  assert.equal(palaceLabel("命宫", "en"), "Life Palace (命宫)");
  assert.equal(timingLayerLabel("流月", "en"), "Monthly cycle (流月)");
  assert.match(baziCaveatLabel("四柱按出生地当地民用时间计算，尚未应用真太阳时校正。", "en"), /true solar time/i);
});

test("English interpretation preserves deterministic IDs while localizing prose", () => {
  const chinese = buildCalculatedExperience(demoBaziReading, "2026-09-20", "zh-CN");
  const english = buildCalculatedExperience(demoBaziReading, "2026-09-20", "en");
  assert.deepEqual(english.facts.map((fact) => fact.id), chinese.facts.map((fact) => fact.id));
  const evidenceIdentity = (items) =>
    items.map(({ factId, system, role }) => ({ factId, system, role }));
  assert.deepEqual(
    evidenceIdentity(english.todayInsight.evidence),
    evidenceIdentity(chinese.todayInsight.evidence),
  );
  assert.equal(english.locale, "en");
  assert.match(english.todayInsight.eyebrow, /Calculated/);
  assert.match(english.timing.disclaimer, /not good luck|not.*probability/i);
});

test("Ask and safety replies follow the language of user input", () => {
  const chineseExperience = buildCalculatedExperience(demoBaziReading, "2026-09-20", "zh-CN");
  const englishAnswer = routeCalculatedAsk("What stage is my career in?", chineseExperience);
  const chineseAnswer = routeCalculatedAsk("我现在的职业处于什么阶段？", chineseExperience);
  assert.match(englishAnswer.disclaimer, /not live AI/i);
  assert.match(chineseAnswer.disclaimer, /不是实时 AI/);
  assert.match(classifySafetyConcern("Should I invest my life savings in this stock?")?.title ?? "", /financial|chart/i);
  assert.match(classifySafetyConcern("我的命盘能看出什么时候怀孕吗？")?.title ?? "", /生育|妊娠/);
});

test("the full report is available in both languages with the same ten-page structure", () => {
  const english = buildCalculatedExperience(demoBaziReading, "2026-09-20", "en");
  const report = buildLifeMapReport(english, "2026-09-20");
  assert.equal(report.locale, "en");
  assert.equal(report.pages.length, 10);
  assert.match(report.title, /Ten-page/);
  assert.match(JSON.stringify(report), /Western natal chart/);
  assert.match(JSON.stringify(report), /Yin \(阴\).*Water \(水\)/);
  assert.match(JSON.stringify(report), /Annual cycle \(流年\)/);
  assert.match(report.disclaimer, /not scientific prediction/i);
});
