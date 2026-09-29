import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../app/ui/LifeMapApp.tsx", import.meta.url), "utf8");
const reportServiceSource = await readFile(new URL("../worker/report-service.ts", import.meta.url), "utf8");
const exampleEnvironment = await readFile(new URL("../.env.example", import.meta.url), "utf8");

test("free-text Ask handoffs never use URL query parameters", () => {
  assert.doesNotMatch(appSource, /\/ask\?/);
  assert.match(appSource, /writeAskHandoff/);
  assert.match(appSource, /consumeAskHandoff/);
});

test("public beta gates personalized routes and fails paid checkout closed", () => {
  assert.match(appSource, /profileProtectedRoutes/);
  assert.match(appSource, /正在确认你的出生档案/);
  assert.match(appSource, /购买尚未开放/);
  assert.match(appSource, /getReportLaunchReadiness/);
  assert.match(appSource, /disabled=\{launchState !== "available" \|\| buying\}/);
  assert.match(reportServiceSource, /PAID_REPORTS_ENABLED === "true"/);
  assert.match(reportServiceSource, /REPORT_PUBLIC_ACCESS_CONFIRMED === "true"/);
  assert.match(exampleEnvironment, /^PAID_REPORTS_ENABLED=false$/m);
});

test("Ask and I Ching both apply deterministic safety boundaries", () => {
  const safetyCalls = appSource.match(/classifySafetyConcern\(/g) ?? [];
  assert.ok(safetyCalls.length >= 2);
  assert.match(appSource, /Life Map 不会根据命盘、卦象或星盘给出高风险专业判断/);
});
