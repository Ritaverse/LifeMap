import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../app/ui/LifeMapApp.tsx", import.meta.url), "utf8");

test("free-text Ask handoffs never use URL query parameters", () => {
  assert.doesNotMatch(appSource, /\/ask\?/);
  assert.match(appSource, /writeAskHandoff/);
  assert.match(appSource, /consumeAskHandoff/);
});

test("public beta gates personalized routes and disables report checkout", () => {
  assert.match(appSource, /profileProtectedRoutes/);
  assert.match(appSource, /正在确认你的出生档案/);
  assert.match(appSource, /购买尚未开放/);
  assert.doesNotMatch(appSource, /createReportCheckout|life-map-report-checkout-started/);
});

test("Ask and I Ching both apply deterministic safety boundaries", () => {
  const safetyCalls = appSource.match(/classifySafetyConcern\(/g) ?? [];
  assert.ok(safetyCalls.length >= 2);
  assert.match(appSource, /Life Map 不会根据命盘、卦象或星盘给出高风险专业判断/);
});
