import assert from "node:assert/strict";
import test from "node:test";

async function render(path) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

const routes = [
  ["/privacy", /隐私政策/, /Open-Meteo/, /sessionStorage/],
  ["/terms", /使用条款/, /不是科学测评/, /购买入口只有在付款验证/],
  ["/digital-delivery", /数字报告交付/, /USD \$2\.00/, /HMAC 验证/],
  ["/refund", /退款政策/, /购买入口关闭/, /14 个自然日/],
  ["/support", /支持/, /尚未启用公开支持渠道/, /付费功能会保持关闭/],
];

test("server-renders public beta trust routes with current-scope disclosures", async () => {
  for (const [path, ...expectations] of routes) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();

    for (const expectation of expectations) assert.match(html, expectation, path);
    for (const [linkedPath] of routes) assert.match(html, new RegExp(`href="${linkedPath}"`), `${path} links ${linkedPath}`);
    assert.match(html, /href="\/"/, `${path} links home`);
    assert.match(html, /公开测试版/);
  }
});
