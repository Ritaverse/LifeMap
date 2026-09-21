import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Life Map landing experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Life Map · 人生地图<\/title>/i);
  assert.match(html, /看见属于你/);
  assert.match(html, /生成我的命盘/);
  assert.match(html, /不是科学预测/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("server-renders directly addressable product routes", async () => {
  for (const path of ["/today", "/life-map", "/ask", "/iching", "/timing", "/objects", "/report", "/me"]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), /Life Map/);
  }
});

test("server-renders the private multi-page report and $2 Shopify handoff", async () => {
  const response = await render("/report");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /完整跨体系每日反思报告/);
  assert.match(html, /购买正式 PDF · USD \$2/);
  assert.match(html, /十页跨体系报告已经准备好/);
  assert.match(html, /紫微十二宫/);
  assert.match(html, /西方本命盘/);
  assert.match(html, /综合洞察不是实时 AI/);
  assert.match(html, /Shopify 只接收商品、数量与价格/);
  assert.match(html, /不是科学预测/);
  assert.doesNotMatch(html, /storefront-access-token/i);
});

test("server-renders the interactive BaZi chart from calculated facts", async () => {
  const response = await render("/life-map");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /你的八字命盘/);
  assert.match(html, /INTERACTIVE CHART · 命盘图/);
  assert.match(html, /日主/);
  assert.match(html, /藏干 · 支内十神/);
  assert.match(html, /数量只描述表层干支/);
  assert.match(html, /VISIBLE ELEMENTS · 表层五行/);
  assert.match(html, /表层五行数量：/);
  assert.match(html, /ZI WEI DOU SHU · 紫微斗数/);
  assert.match(html, /WESTERN NATAL · 西方占星/);
  assert.match(html, /data-chart-system="bazi"/);
  assert.match(html, /data-chart-system="ziwei"/);
  assert.match(html, /data-chart-system="astrology"/);
  assert.match(html, /图上事实/);
  assert.match(html, /传统观察/);
  assert.match(html, /阅读边界/);
  assert.match(html, /正式 PDF 为 USD \$2/);
  assert.ok((html.match(/href="\/report"/g) ?? []).length >= 3);
  assert.ok((html.match(/详细解释/g) ?? []).length >= 3);
  assert.match(html, /<svg\b/i);
});

test("server-renders original product imagery with useful alternative text", async () => {
  const response = await render("/objects");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /\/images\/products\/green-aventurine\.jpg/);
  assert.match(html, /一块置于深色石台上的天然绿东陵石/);
  assert.match(html, /\/images\/products\/personal-life-map-art\.jpg/);
  assert.doesNotMatch(html, /的抽象演示图/);
});

test("unknown dynamic records render a useful error state", async () => {
  for (const path of ["/insights/missing", "/life-map/missing", "/objects/missing"]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), /没有找到/);
  }
});
