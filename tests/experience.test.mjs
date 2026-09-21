import assert from "node:assert/strict";
import test from "node:test";
import { calculateBazi, demoBaziReading, demoBirthProfile } from "../app/lib/bazi.ts";
import { buildCalculatedExperience, getChartExplanationPreview, resolveCalculatedEvidence, routeCalculatedAsk } from "../app/lib/experience.ts";

test("calculated experience derives synthesis only from calculated facts", () => {
  const first = buildCalculatedExperience(demoBaziReading, "2026-09-20");
  const second = buildCalculatedExperience(demoBaziReading, "2026-09-20");
  assert.deepEqual(first, second);
  assert.equal(first.todayInsight.title, "探索 · 重构");
  assert.ok(first.todayInsight.evidence.length >= 2);
  assert.ok(first.todayInsight.evidence.every((item) => item.factId.startsWith("fact-calculated-")));
  assert.equal(resolveCalculatedEvidence(first, first.todayInsight.evidence).length, first.todayInsight.evidence.length);
  assert.ok(first.facts.some((fact) => fact.system === "bazi"));
  assert.ok(first.facts.some((fact) => fact.system === "ziwei"));
  assert.ok(first.facts.some((fact) => fact.system === "astrology"));
});

test("domain and Ask outputs stay linked to versioned evidence", () => {
  const experience = buildCalculatedExperience(demoBaziReading, "2026-09-20");
  for (const domain of experience.domains) {
    const insight = experience.domainInsights[domain.id];
    assert.ok(insight.evidence.length >= 2);
    assert.doesNotThrow(() => resolveCalculatedEvidence(experience, insight.evidence));
  }
  const answer = routeCalculatedAsk("我现在的职业处于什么阶段？", experience);
  assert.equal(answer.category, "career-transition");
  assert.ok(answer.sections[0].evidence.every((item) => item.factId.startsWith("fact-calculated-")));
  assert.match(answer.disclaimer, /不是实时 AI/);
});

test("timing snapshot identifies its date and calculated source facts", () => {
  const experience = buildCalculatedExperience(demoBaziReading, "2026-09-20");
  assert.equal(experience.timing.asOf, "2026-09-20");
  assert.equal(experience.timing.start, "2026.09.01");
  assert.equal(experience.timing.end, "2026.09.30");
  assert.ok(experience.timing.facts.length >= 2);
  assert.ok(experience.timing.disclaimer.includes("不是好运、坏运"));
});

test("chart explanation previews remain linked to calculated natal facts", () => {
  const experience = buildCalculatedExperience(demoBaziReading, "2026-09-20");
  for (const system of ["bazi", "ziwei", "astrology"]) {
    const preview = getChartExplanationPreview(experience, system);
    assert.equal(preview.lines.length, 3);
    assert.ok(preview.lines.every((line) => line.text.endsWith("。")));
    assert.ok(preview.evidenceFactId);
    assert.ok(experience.facts.some((fact) => fact.id === preview.evidenceFactId && fact.system === system));
  }
});

test("chart explanation previews preserve unknown-time limits", () => {
  const reading = calculateBazi({ ...demoBirthProfile, birthTime: null, timeAccuracy: "unknown" });
  const experience = buildCalculatedExperience(reading, "2026-09-20");
  const ziwei = getChartExplanationPreview(experience, "ziwei");
  const western = getChartExplanationPreview(experience, "astrology");
  assert.equal(ziwei.evidenceFactId, null);
  assert.match(ziwei.lines.map((line) => line.text).join(" "), /出生时间未知|不会用其他出生时间/);
  assert.match(western.lines[2].text, /未使用上升点、天顶或宫位/);
});
