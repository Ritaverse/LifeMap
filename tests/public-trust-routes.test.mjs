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
  ["/terms", /使用条款/, /不是科学测评/, /销售尚未开放/],
  ["/digital-delivery", /数字报告交付/, /报告销售尚未开放/, /不会在付款后生成或发送 PDF/],
  ["/refund", /退款政策/, /测试期间没有需要退款的销售/, /重复扣款/],
  ["/support", /支持/, /尚未启用公开支持邮箱/, /站点会保持非公开/],
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
