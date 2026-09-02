import assert from "node:assert/strict";
import test from "node:test";
import { iching } from "../app/lib/data.ts";
import { resolveEvidence, routeAsk, validateFixtures } from "../app/lib/repository.ts";

test("all fixture references resolve", () => {
  assert.equal(validateFixtures(), true);
});

test("evidence remains linked to matching systems", () => {
  const resolved = resolveEvidence([
    { factId: "fact-ziwei-career-tianji-authority", system: "ziwei", role: "primary", contribution: "test" },
  ]);
  assert.equal(resolved[0].fact.system, "ziwei");
});

test("Ask routing is deterministic", () => {
  assert.equal(routeAsk("我最近想换工作").category, "career-transition");
  assert.equal(routeAsk("一段关系让我困惑").category, "relationship-pattern");
  assert.equal(routeAsk("想开始一个新项目").category, "new-beginning");
  assert.equal(routeAsk("没有匹配的问题").category, "general");
});

test("I Ching lines are ordered bottom-to-top and stable", () => {
  assert.deepEqual(iching.lines.map((line) => line.position), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(iching.lines.filter((line) => line.moving).map((line) => line.position), [2]);
});
