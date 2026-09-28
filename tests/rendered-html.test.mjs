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
  assert.match(html, /<title>Life Map · 观星读象，照见更好的自己<\/title>/i);
  assert.match(html, /观星读象/);
  assert.match(html, /照见更好的自己/);
  assert.match(html, /东方命理 × 西方占星 × 自我成长 × 同路社区/);
  assert.match(html, /同路社区仍在生长/);
  assert.match(html, /COMMUNITY IN THE MAKING/);
  assert.match(html, /aria-label="Life Map 首页"/);
  assert.match(html, /brand-mark__orbit/);
  assert.match(html, /life-map-social\.jpg/);
  assert.match(html, /免费生成三体系快照/);
  assert.match(html, /象征物商城/);
  assert.match(html, /进入商城/);
  assert.match(html, /不是科学预测/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("server-renders public routes and safely gates personalized routes", async () => {
  for (const path of ["/objects", "/privacy", "/terms", "/digital-delivery", "/refund", "/support"]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), /Life Map/);
  }

  for (const path of ["/today", "/life-map", "/ask", "/iching", "/timing", "/report", "/me"]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, /正在确认你的出生档案/, path);
    assert.doesNotMatch(html, /你好，Yu|Yu 的人生地图/, path);
  }
});

test("server never renders a purchasable report without a verified browser profile", async () => {
  const response = await render("/report");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /正在确认你的出生档案/);
  assert.match(html, /noindex/);
  assert.doesNotMatch(html, /购买 Daily Report|购买 10 页 Detailed Report|\$1\.99|\$19\.99|myshopify/i);
});

test("server keeps calculated chart facts behind the local profile gate", async () => {
  const response = await render("/life-map");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /正在确认你的出生档案/);
  assert.doesNotMatch(html, /你的八字命盘|ZI WEI DOU SHU|WESTERN NATAL|data-chart-system/);
});

test("server keeps the decision session behind the local profile gate", async () => {
  const response = await render("/ask");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /正在确认你的出生档案/);
  assert.doesNotMatch(html, /你正在面对什么问题|生成我的决策地图/);
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
  assert.match(html, /src="\/images\/products\/green-aventurine\.jpg"/);
  assert.match(html, /一块置于深色石台上的天然绿东陵石/);
  assert.match(html, /src="\/images\/products\/personal-life-map-art\.jpg"/);
  assert.doesNotMatch(html, /的抽象演示图/);
});

test("unknown dynamic records render a useful error state", async () => {
  for (const path of ["/insights/missing", "/life-map/missing", "/objects/missing"]) {
    const response = await render(path);
    assert.equal(response.status, 404, path);
    assert.match(await response.text(), /这里没有找到对应的页面/);
  }
});
