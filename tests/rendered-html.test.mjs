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
  assert.match(html, /把此刻的问题/);
  assert.match(html, /免费生成三体系快照/);
  assert.match(html, /象征物商城/);
  assert.match(html, /进入商城/);
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

test("server-renders both one-time report tiers and evidence-grounded previews", async () => {
  const response = await render("/report");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Daily Report/);
  assert.match(html, /购买 Daily Report · \$1\.99/);
  assert.match(html, /购买 10 页 Detailed Report · \$19\.99/);
  assert.match(html, /一页的结构，先完整看清/);
  assert.match(html, /十页目录与三个完整章节/);
  assert.match(html, /紫微十二宫/);
  assert.match(html, /西方本命盘/);
  assert.match(html, /今日综合洞察/);
  assert.match(html, /命盘内容不会发送给 Shopify/);
  assert.match(html, /不会自动续费/);
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
  assert.match(html, /所有计算细节保持免费可查/);
  assert.match(html, /完整盘负责展示/);
  assert.doesNotMatch(html, /正式 PDF 为 USD \$2/);
  assert.match(html, /<svg\b/i);
});

test("server-renders the structured decision session", async () => {
  const response = await render("/ask");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /DECISION SESSION/);
  assert.match(html, /你正在面对什么问题/);
  assert.match(html, /你正在比较哪些选择/);
  assert.match(html, /生成我的决策地图/);
});

test("server-renders original product imagery with useful alternative text", async () => {
  const response = await render("/objects");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /LIFE MAP OBJECTS · ONLINE SHOP/);
  assert.match(html, /浏览全部商品/);
  assert.match(html, /天然石/);
  assert.match(html, /五行手链/);
  assert.match(html, /命盘艺术/);
  assert.match(html, /无功效承诺/);
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
