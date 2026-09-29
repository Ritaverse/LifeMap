import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrivateReportJob,
  createReportCheckout,
  exchangeReportAccessToken,
  getReportLaunchReadiness,
  requestReportAccess,
} from "../app/lib/shopify.ts";
import {
  FULL_REPORT_PRODUCT,
  REPORT_SCHEMA_VERSION,
  REPORT_JOB_LINE_ATTRIBUTE,
} from "../app/lib/report-product.ts";

test("the catalog exposes one exact USD $2 full-report product", () => {
  assert.deepEqual(FULL_REPORT_PRODUCT, {
    key: "full-report-v1",
    productId: "gid://shopify/Product/8295435862085",
    variantId: "gid://shopify/ProductVariant/45796622925893",
    variantNumericId: "45796622925893",
    title: "Life Map Full Personal Report",
    price: "2.00",
    amountCents: 200,
    currencyCode: "USD",
    pages: 10,
  });
  assert.equal(REPORT_JOB_LINE_ATTRIBUTE, "_life_map_report_job_id");
});

test("the client uploads finished PDF bytes only to the private report API", async () => {
  const pdf = new TextEncoder().encode("%PDF-1.7\nprivate finished report\n%%EOF");
  let requestUrl = "";
  let requestInit;
  const receipt = await createPrivateReportJob(pdf, async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return Response.json({
      jobId: "11111111-1111-4111-8111-111111111111",
      capability: "opaque-capability",
      expiresAt: "2026-09-29T00:00:00.000Z",
    }, { status: 201 });
  });

  assert.equal(requestUrl, "/api/report/jobs");
  assert.equal(requestInit.method, "POST");
  assert.equal(requestInit.headers["content-type"], "application/pdf");
  assert.equal(requestInit.headers["x-life-map-pdf-pages"], "10");
  assert.equal(requestInit.headers["x-life-map-report-schema"], REPORT_SCHEMA_VERSION);
  assert.equal(requestInit.headers["x-life-map-report-locale"], "zh-CN");
  assert.match(requestInit.headers["x-life-map-pdf-sha256"], /^[a-f0-9]{64}$/);
  assert.equal(await requestInit.body.text(), new TextDecoder().decode(pdf));
  assert.equal(receipt.capability, "opaque-capability");
  assert.equal(receipt.locale, "zh-CN");
  assert.doesNotMatch(JSON.stringify(requestInit.headers), /name|birth|location|pillar|profile/i);
});

test("the client sends only a canonical non-sensitive report locale", async () => {
  const pdf = new TextEncoder().encode("%PDF-1.7\nprivate English report\n%%EOF");
  let requestInit;
  const receipt = await createPrivateReportJob(pdf, "en", async (_input, init) => {
    requestInit = init;
    return Response.json({
      jobId: "22222222-2222-4222-8222-222222222222",
      capability: "opaque-capability",
      expiresAt: "2026-09-29T00:00:00.000Z",
      locale: "en",
    }, { status: 201 });
  });

  assert.equal(requestInit.headers["x-life-map-report-locale"], "en");
  assert.equal(receipt.locale, "en");
  assert.doesNotMatch(JSON.stringify(requestInit.headers), /name|birth|location|pillar|profile/i);
});

test("checkout sends only an opaque job capability to the Life Map backend", async () => {
  const job = {
    jobId: "11111111-1111-4111-8111-111111111111",
    capability: "opaque-capability",
  };
  let requestUrl = "";
  let requestInit;
  const checkout = await createReportCheckout(job, async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return Response.json({
      checkoutUrl: "https://dj4xdu-gb.myshopify.com/checkouts/example",
      amount: "2.00",
      currencyCode: "USD",
    });
  });

  assert.equal(requestUrl, `/api/report/jobs/${job.jobId}/checkout`);
  assert.equal(requestInit.method, "POST");
  assert.equal(requestInit.headers.authorization, `Bearer ${job.capability}`);
  assert.equal(requestInit.body, undefined);
  assert.deepEqual(checkout, {
    checkoutUrl: "https://dj4xdu-gb.myshopify.com/checkouts/example",
    amount: "2.00",
    currencyCode: "USD",
  });
});

test("readiness fails closed and access secrets stay out of URLs", async () => {
  assert.deepEqual(await getReportLaunchReadiness(async () => new Response("offline", { status: 503 })), { available: false });

  const requests = [];
  const fetcher = async (input, init) => {
    requests.push({ input: String(input), init });
    return Response.json(String(input).endsWith("/exchange") ? { available: true, locale: "en" } : { accepted: true });
  };
  await requestReportAccess("#1001", "reader@example.test", fetcher);
  assert.deepEqual(await exchangeReportAccessToken("a".repeat(64), fetcher), { available: true, locale: "en" });

  assert.deepEqual(requests.map((request) => request.input), [
    "/api/report/access/request",
    "/api/report/access/exchange",
  ]);
  assert.equal(requests.some((request) => request.input.includes("reader@example.test")), false);
  assert.equal(requests.some((request) => request.input.includes("a".repeat(64))), false);
  assert.match(String(requests[0].init.body), /reader@example\.test/);
  assert.match(String(requests[1].init.body), new RegExp("a{64}"));
});
