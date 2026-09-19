import assert from "node:assert/strict";
import test from "node:test";
import { askResponses, domains, iching, insights, products, recommendation } from "../app/lib/data.ts";
import {
  getDomain,
  getInsight,
  getProduct,
  resolveEvidence,
  routeAsk,
  validateFixtures,
} from "../app/lib/repository.ts";

test("all fixture references resolve", () => {
  assert.equal(validateFixtures(), true);
});

test("evidence remains linked to matching systems", () => {
  const resolved = resolveEvidence([
    { factId: "fact-ziwei-career-tianji-authority", system: "ziwei", role: "primary", contribution: "test" },
  ]);
  assert.equal(resolved[0].fact.system, "ziwei");
});

test("missing and mismatched evidence fail loudly", () => {
  assert.throws(
    () => resolveEvidence([{ factId: "fact-missing", system: "bazi", role: "primary", contribution: "test" }]),
    /Missing demo fact/,
  );
  assert.throws(
    () => resolveEvidence([{ factId: "fact-ziwei-career-tianji-authority", system: "bazi", role: "primary", contribution: "test" }]),
    /Evidence system mismatch/,
  );
});

test("fixture selectors resolve stable records by id and slug", () => {
  assert.equal(getInsight("insight-today-selection").title, "收敛 · 选择");
  assert.equal(getDomain("career").insightId, "insight-career-builder-explorer");
  assert.equal(getProduct("product-green-aventurine").slug, "green-aventurine");
  assert.equal(getProduct("green-aventurine").id, "product-green-aventurine");
});

test("Ask routing is deterministic", () => {
  assert.equal(routeAsk("我最近想换工作").category, "career-transition");
  assert.equal(routeAsk("一段关系让我困惑").category, "relationship-pattern");
  assert.equal(routeAsk("想开始一个新项目").category, "new-beginning");
  assert.equal(routeAsk("I feel a CONTRADICTION inside").category, "internal-tension");
  assert.equal(routeAsk("关系冲突让我困惑").category, "relationship-pattern");
  assert.equal(routeAsk("没有匹配的问题").category, "general");
  assert.equal(routeAsk("没有匹配的问题"), routeAsk("没有匹配的问题"));
});

test("every Ask answer keeps its evidence resolvable", () => {
  for (const response of askResponses) {
    for (const section of response.sections) {
      assert.doesNotThrow(() => resolveEvidence(section.evidence), `${response.id}: ${section.heading}`);
    }
  }
});

test("insights satisfy evidence and consensus rules", () => {
  for (const insight of insights) {
    assert.ok(insight.evidence.length > 0, insight.id);
    assert.doesNotThrow(() => resolveEvidence(insight.evidence), insight.id);
    if (insight.kind === "consensus") {
      assert.ok(new Set(insight.evidence.map((item) => item.system)).size >= 2, insight.id);
    }
  }
});

test("domain, product, and recommendation identifiers remain unique and linked", () => {
  assert.equal(new Set(domains.map((item) => item.id)).size, domains.length);
  assert.equal(new Set(products.map((item) => item.id)).size, products.length);
  assert.equal(new Set(products.map((item) => item.slug)).size, products.length);
  assert.equal(products.filter((item) => item.featured).length, 1);
  assert.equal(products.find((item) => item.featured)?.id, recommendation.productId);
  for (const product of products) {
    assert.match(product.image.src, /^\/images\/products\/.+\.(?:jpg|png|webp)$/);
    assert.ok(product.image.alt.trim().length > 0, product.id);
  }
});

test("I Ching lines are ordered bottom-to-top and stable", () => {
  assert.deepEqual(iching.lines.map((line) => line.position), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(iching.lines.filter((line) => line.moving).map((line) => line.position), [2]);
  for (const line of iching.lines) {
    assert.equal(line.coinFaces.length, 3);
    assert.equal(line.polarity, line.value % 2 === 0 ? "yin" : "yang");
    assert.equal(line.moving, line.value === 6 || line.value === 9);
  }
});
