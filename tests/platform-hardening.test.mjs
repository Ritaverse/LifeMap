import assert from "node:assert/strict";
import test from "node:test";
import { createReportCheckout } from "../app/lib/shopify.ts";
import { resolvePublicSiteUrl, resolveSupportEmail } from "../app/lib/site-config.ts";

async function render(path = "/", origin = "https://life-map.ritaverse.chatgpt.site") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("platform-test", `${process.pid}-${Date.now()}-${path}-${origin}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`${origin}${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("public site URL parsing accepts safe origins and rejects unsafe configuration", () => {
  assert.equal(resolvePublicSiteUrl("https://lifemap.example.com/path?query=1#hash").toString(), "https://lifemap.example.com/");
  assert.equal(resolvePublicSiteUrl("http://localhost:3000/path").toString(), "http://localhost:3000/");
  assert.equal(resolvePublicSiteUrl("http://lifemap.example.com").toString(), "https://life-map.ritaverse.chatgpt.site/");
  assert.equal(resolvePublicSiteUrl("https://user:secret@lifemap.example.com").toString(), "https://life-map.ritaverse.chatgpt.site/");
});

test("support email appears only after an operational address is configured", () => {
  assert.equal(resolveSupportEmail("support@ritaverse.com"), "support@ritaverse.com");
  assert.equal(resolveSupportEmail(" support@ritaverse.com "), "support@ritaverse.com");
  assert.equal(resolveSupportEmail("support@example.com"), null);
  assert.equal(resolveSupportEmail("not-an-email"), null);
});

test("production responses include compatible security headers", async () => {
  const response = await render();
  const policy = response.headers.get("content-security-policy") ?? "";

  assert.equal(response.status, 200);
  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /script-src 'self' 'unsafe-inline'/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /connect-src[^;]*https:\/\/geocoding-api\.open-meteo\.com/);
  assert.match(policy, /connect-src[^;]*https:\/\/dj4xdu-gb\.myshopify\.com/);
  assert.doesNotMatch(policy, /unsafe-eval/);
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
  assert.match(response.headers.get("permissions-policy") ?? "", /camera=\(\)/);
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
  const html = await response.text();
  assert.match(html, /<link rel="canonical" href="https:\/\/life-map\.ritaverse\.chatgpt\.site\/"/);
  assert.match(html, /<link rel="manifest" href="https:\/\/life-map\.ritaverse\.chatgpt\.site\/manifest\.webmanifest"/);
});

test("HSTS is only sent over HTTPS", async () => {
  const response = await render("/", "http://localhost");
  assert.equal(response.headers.has("strict-transport-security"), false);
  assert.match(response.headers.get("content-security-policy") ?? "", /unsafe-eval/);
});

test("personalized routes are private and excluded from indexing", async () => {
  const response = await render("/today");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  assert.match(await response.text(), /<meta name="robots" content="noindex, nofollow, noarchive, noimageindex, nocache"/i);

  const catalog = await render("/objects");
  assert.equal(catalog.headers.has("x-robots-tag"), false);
});

test("robots, sitemap, manifest, and not-found routes render", async () => {
  const robots = await render("/robots.txt");
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Disallow: \/today/);

  const sitemap = await render("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  const sitemapBody = await sitemap.text();
  assert.match(sitemapBody, /https:\/\/life-map\.ritaverse\.chatgpt\.site\/objects/);
  assert.match(sitemapBody, /https:\/\/life-map\.ritaverse\.chatgpt\.site\/privacy/);
  assert.match(sitemapBody, /https:\/\/life-map\.ritaverse\.chatgpt\.site\/digital-delivery/);
  assert.match(sitemapBody, /https:\/\/life-map\.ritaverse\.chatgpt\.site\/refund/);
  assert.doesNotMatch(sitemapBody, /\/today/);

  const manifest = await render("/manifest.webmanifest");
  assert.equal(manifest.status, 200);
  assert.equal((await manifest.json()).name, "Life Map · 人生地图");

  const missing = await render("/this-route-does-not-exist");
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /这里没有找到对应的页面/);
});

test("checkout accepts exact Shopify hosts and rejects other myshopify stores", async () => {
  const previous = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN = "public-test-token";
  try {
    const trusted = await createReportCheckout("daily", async () => new Response(JSON.stringify({
      data: {
        cartCreate: {
          cart: {
            checkoutUrl: "https://checkout.shopify.com/checkouts/example",
            totalQuantity: 1,
            cost: { totalAmount: { amount: "1.99", currencyCode: "USD" } },
          },
          userErrors: [],
          warnings: [],
        },
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    assert.equal(new URL(trusted.checkoutUrl).hostname, "checkout.shopify.com");

    await assert.rejects(
      () => createReportCheckout("daily", async () => new Response(JSON.stringify({
        data: {
          cartCreate: {
            cart: {
              checkoutUrl: "https://attacker.myshopify.com/checkouts/example",
              totalQuantity: 1,
              cost: { totalAmount: { amount: "1.99", currencyCode: "USD" } },
            },
            userErrors: [],
            warnings: [],
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } })),
      /unexpected checkout address/,
    );
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
    else process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN = previous;
  }
});
