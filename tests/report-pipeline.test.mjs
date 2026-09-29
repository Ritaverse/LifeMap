import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";

import { Miniflare } from "miniflare";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { tsImport } from "tsx/esm/api";

const {
  handleReportRequest,
  hasPaidLaunchConfiguration,
  ReportService,
  validatePaidOrder,
} = await tsImport("../worker/report-service.ts", import.meta.url);
const {
  FULL_REPORT_PRODUCT,
  REPORT_JOB_LINE_ATTRIBUTE,
  REPORT_SCHEMA_VERSION,
  SHOPIFY_STOREFRONT_API_VERSION,
  SHOPIFY_STORE_DOMAIN,
} = await tsImport("../app/lib/report-product.ts", import.meta.url);
const { decryptString } = await tsImport("../worker/report-crypto.ts", import.meta.url);

const SITE_ORIGIN = "https://lifemap.fyi";
const BASE_TIME = 1_800_000_000;
const WEBHOOK_SECRET = "shopify-webhook-secret-for-tests-123456789";
const migrationDirectory = new URL("../drizzle/", import.meta.url);

let miniflare;
let db;
let reports;
let env;
let service;
let now;
let shopifyMode;
let emails;
let shopifyRequests;
let sequence = 0;
let clientSequence = 0;
let pdfFixture;

function testPdf() {
  return Uint8Array.from(pdfFixture);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function nextId(prefix) {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

function cartResponse(jobId, overrides = {}) {
  const amount = overrides.amount ?? FULL_REPORT_PRODUCT.price;
  const currency = overrides.currency ?? FULL_REPORT_PRODUCT.currencyCode;
  return {
    data: {
      cartCreate: {
        cart: {
          checkoutUrl: `https://${SHOPIFY_STORE_DOMAIN}/checkouts/${jobId}`,
          totalQuantity: overrides.totalQuantity ?? 1,
          lines: {
            nodes: [{
              quantity: 1,
              attributes: [{ key: REPORT_JOB_LINE_ATTRIBUTE, value: jobId }],
              merchandise: { id: FULL_REPORT_PRODUCT.variantId },
            }],
          },
          cost: {
            subtotalAmount: { amount, currencyCode: currency },
            totalAmount: { amount, currencyCode: currency },
          },
        },
        userErrors: [],
        warnings: [],
      },
    },
  };
}

async function fakeFetch(input, init = {}) {
  const url = String(input);
  if (url.includes("/graphql.json")) {
    const body = JSON.parse(String(init.body));
    shopifyRequests.push({ url, init, body });
    const jobId = body.variables.input.lines[0].attributes[0].value;
    if (shopifyMode === "http-error") return new Response("unavailable", { status: 503 });
    if (shopifyMode === "rejected") {
      return Response.json({ data: { cartCreate: { cart: null, userErrors: [{ message: "not available" }], warnings: [] } } });
    }
    if (shopifyMode === "wrong-amount") return Response.json(cartResponse(jobId, { amount: "2.01" }));
    if (shopifyMode === "normalized-decimal") return Response.json(cartResponse(jobId, { amount: "2.0" }));
    return Response.json(cartResponse(jobId));
  }
  if (url === "https://api.resend.com/emails") {
    const body = JSON.parse(String(init.body));
    emails.push({ init, body });
    return Response.json({ id: nextId("email") });
  }
  throw new Error(`Unexpected outbound request: ${url}`);
}

function executionContext() {
  const promises = [];
  return {
    promises,
    waitUntil(promise) {
      promises.push(promise);
    },
  };
}

async function call(request) {
  const context = executionContext();
  const response = await service.handle(request, context);
  assert.ok(response instanceof Response, "report service should handle the request");
  await Promise.all(context.promises);
  return response;
}

async function createJob({ checkout = true, clientIp } = {}) {
  const pdf = testPdf();
  const createResponse = await call(new Request(`${SITE_ORIGIN}/api/report/jobs`, {
    method: "POST",
    headers: {
      "content-type": "application/pdf",
      "cf-connecting-ip": clientIp ?? `203.0.113.${++clientSequence}`,
      origin: SITE_ORIGIN,
      "x-life-map-pdf-pages": String(FULL_REPORT_PRODUCT.pages),
      "x-life-map-report-schema": REPORT_SCHEMA_VERSION,
      "x-life-map-pdf-sha256": sha256(pdf),
    },
    body: pdf,
  }));
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();

  if (!checkout) return { ...created, pdf };
  const checkoutResponse = await call(new Request(
    `${SITE_ORIGIN}/api/report/jobs/${created.jobId}/checkout`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${created.capability}`,
        origin: SITE_ORIGIN,
      },
    },
  ));
  assert.equal(checkoutResponse.status, 200);
  return { ...created, pdf, checkout: await checkoutResponse.json() };
}

function paidOrder(jobId, overrides = {}) {
  const orderId = overrides.id ?? nextId("order");
  const orderNumber = overrides.name ?? `#${nextId("number")}`;
  const lineItemId = overrides.lineItemId ?? nextId("line");
  return {
    id: orderId,
    name: orderNumber,
    contact_email: overrides.contact_email ?? "buyer@example.com",
    currency: overrides.currency ?? FULL_REPORT_PRODUCT.currencyCode,
    financial_status: overrides.financial_status ?? "paid",
    current_subtotal_price: overrides.current_subtotal_price ?? FULL_REPORT_PRODUCT.price,
    current_total_price: overrides.current_total_price ?? FULL_REPORT_PRODUCT.price,
    current_total_tax: overrides.current_total_tax ?? "0.00",
    current_total_discounts: overrides.current_total_discounts ?? "0.00",
    total_discounts: overrides.total_discounts ?? "0.00",
    current_shipping_price_set: overrides.current_shipping_price_set ?? {
      shop_money: { amount: "0.00", currency_code: FULL_REPORT_PRODUCT.currencyCode },
    },
    current_total_additional_fees_set: overrides.current_total_additional_fees_set ?? null,
    current_total_duties_set: overrides.current_total_duties_set ?? null,
    test: overrides.test ?? true,
    line_items: [{
      id: lineItemId,
      variant_id: overrides.variant_id ?? FULL_REPORT_PRODUCT.variantNumericId,
      quantity: overrides.quantity ?? 1,
      current_quantity: overrides.current_quantity ?? 1,
      price: overrides.price ?? FULL_REPORT_PRODUCT.price,
      final_line_price: overrides.final_line_price ?? FULL_REPORT_PRODUCT.price,
      properties: [{ name: REPORT_JOB_LINE_ATTRIBUTE, value: jobId }],
      discount_allocations: overrides.discount_allocations ?? [],
    }],
  };
}

function webhookRequest(topic, payload, webhookId = nextId("webhook"), hmac = null) {
  const body = JSON.stringify(payload);
  const signature = hmac ?? createHmac("sha256", WEBHOOK_SECRET).update(body).digest("base64");
  return new Request(`${SITE_ORIGIN}/api/webhooks/shopify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shopify-api-version": SHOPIFY_STOREFRONT_API_VERSION,
      "x-shopify-event-id": nextId("event"),
      "x-shopify-hmac-sha256": signature,
      "x-shopify-shop-domain": SHOPIFY_STORE_DOMAIN,
      "x-shopify-topic": topic,
      "x-shopify-webhook-id": webhookId,
    },
    body,
  });
}

function accessTokenFromEmail(email) {
  const match = email.body.text.match(/#token=([a-f0-9]{64})/i);
  assert.ok(match, "delivery email should contain a fragment-only access token");
  return match[1];
}

async function pay(job, overrides = {}) {
  const order = paidOrder(job.jobId, overrides);
  const before = emails.length;
  const webhookId = nextId("paid-webhook");
  const response = await call(webhookRequest("orders/paid", order, webhookId));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
  if (emails.length !== before + 1) {
    const outbox = await db.prepare(
      "SELECT * FROM delivery_outbox WHERE job_id = ?",
    ).bind(job.jobId).first();
    let decryptError = null;
    try {
      await decryptString(env.REPORT_PII_KEY, outbox.recipient_ciphertext, outbox.recipient_nonce);
    } catch (error) {
      decryptError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }
    assert.fail(`delivery email was not sent: ${JSON.stringify({
      status: outbox.status,
      attempts: outbox.attempts,
      lastError: outbox.last_error_code,
      ciphertextType: outbox.recipient_ciphertext?.constructor?.name,
      ciphertextLength: outbox.recipient_ciphertext?.byteLength,
      nonceType: outbox.recipient_nonce?.constructor?.name,
      nonceLength: outbox.recipient_nonce?.byteLength,
      decryptError,
    })}`);
  }
  return {
    order,
    webhookId,
    token: accessTokenFromEmail(emails.at(-1)),
  };
}

async function exchange(token) {
  return call(new Request(`${SITE_ORIGIN}/api/report/access/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: SITE_ORIGIN },
    body: JSON.stringify({ token }),
  }));
}

function sessionCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie?.startsWith("__Host-life_map_report_session="));
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Strict/);
  return setCookie.split(";", 1)[0];
}

async function jobRow(jobId) {
  return db.prepare("SELECT * FROM report_jobs WHERE id = ?").bind(jobId).first();
}

before(async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let page = 0; page < FULL_REPORT_PRODUCT.pages; page += 1) {
    pdf.addPage().drawText(`Life Map private report page ${page + 1}`, { font, size: 12 });
  }
  pdfFixture = Uint8Array.from(await pdf.save({ addDefaultPage: false }));
  assert.ok(pdfFixture.byteLength >= 1_024);

  miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    compatibilityDate: "2026-05-22",
    d1Databases: ["DB"],
    r2Buckets: ["REPORTS"],
  });
  db = await miniflare.getD1Database("DB");
  reports = await miniflare.getR2Bucket("REPORTS");
  const migrationFiles = (await readdir(migrationDirectory))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
  for (const migrationFile of migrationFiles) {
    const migration = await readFile(new URL(migrationFile, migrationDirectory), "utf8");
    for (const statement of migration.split("--> statement-breakpoint").map((value) => value.trim()).filter(Boolean)) {
      await db.prepare(statement).run();
    }
  }
});

after(async () => {
  await miniflare?.dispose();
});

beforeEach(() => {
  now = BASE_TIME;
  shopifyMode = "success";
  emails = [];
  shopifyRequests = [];
  env = {
    ASSETS: { fetch: async () => new Response("not used", { status: 404 }) },
    DB: db,
    REPORTS: reports,
    PAID_REPORTS_ENABLED: "true",
    SHOPIFY_STOREFRONT_TOKEN: "storefront-test-token",
    SHOPIFY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    REPORT_TOKEN_SECRET: "report-token-secret-for-tests-123456789",
    REPORT_EMAIL_HASH_SECRET: "report-email-hash-secret-for-tests-123456789",
    REPORT_RATE_LIMIT_SECRET: "report-rate-limit-secret-for-tests-123456789",
    REPORT_PII_KEY: Buffer.alloc(32, 7).toString("base64"),
    RESEND_API_KEY: "resend-test-key",
    REPORT_DELIVERY_FROM: "Life Map <reports@lifemap.fyi>",
    NEXT_PUBLIC_SITE_URL: SITE_ORIGIN,
    NEXT_PUBLIC_SUPPORT_EMAIL: "support@lifemap.fyi",
    REPORT_WEBHOOKS_CONFIGURED: "true",
    REPORT_CLEANUP_CONFIGURED: "true",
    REPORT_PUBLIC_ACCESS_CONFIRMED: "true",
    REPORT_POLICIES_CONFIRMED: "true",
    REPORT_TEST_ORDERS_ONLY: "false",
  };
  service = new ReportService(env, { now: () => now, fetcher: fakeFetch });
});

test("successful $2 paid order delivers one private PDF and enforces one-use access", async () => {
  const readiness = await call(new Request(`${SITE_ORIGIN}/api/report/readiness`));
  assert.deepEqual(await readiness.json(), { available: true });

  const job = await createJob();
  assert.equal(job.checkout.amount, "2.00");
  assert.equal(job.checkout.currencyCode, "USD");
  assert.match(job.checkout.checkoutUrl, new RegExp(`^https://${SHOPIFY_STORE_DOMAIN}/checkouts/`));
  assert.equal(shopifyRequests.length, 1);
  assert.deepEqual(shopifyRequests[0].body.variables.input, {
    lines: [{
      merchandiseId: FULL_REPORT_PRODUCT.variantId,
      quantity: 1,
      attributes: [{ key: REPORT_JOB_LINE_ATTRIBUTE, value: job.jobId }],
    }],
  });
  assert.doesNotMatch(JSON.stringify(shopifyRequests[0].body.variables), /birth|location|pillar|profile|buyer|email/i);

  const paid = await pay(job, { id: "success-order", name: "#1001", lineItemId: "success-line" });
  const delivered = await jobRow(job.jobId);
  assert.equal(delivered.status, "delivered");
  assert.equal(delivered.shopify_order_id, "success-order");
  assert.equal(delivered.expected_amount_cents, 200);
  assert.equal(delivered.expected_currency, "USD");
  assert.equal(emails.length, 1);
  assert.equal(emails[0].body.to[0], "buyer@example.com");
  assert.equal(emails[0].init.headers["idempotency-key"], "report-paid-success-order");

  const outbox = await db.prepare("SELECT * FROM delivery_outbox WHERE job_id = ?").bind(job.jobId).first();
  assert.equal(outbox.status, "sent");
  assert.equal(outbox.recipient_ciphertext, null);
  assert.equal(outbox.recipient_nonce, null);

  const exchangeResponse = await exchange(paid.token);
  assert.equal(exchangeResponse.status, 200);
  const cookie = sessionCookie(exchangeResponse);
  assert.equal((await exchange(paid.token)).status, 410, "email link tokens are single use");

  for (let downloadNumber = 1; downloadNumber <= 3; downloadNumber += 1) {
    const download = await call(new Request(`${SITE_ORIGIN}/api/report/download`, { headers: { cookie } }));
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("content-type"), "application/pdf");
    assert.deepEqual(new Uint8Array(await download.arrayBuffer()), job.pdf);
  }
  assert.equal(
    (await call(new Request(`${SITE_ORIGIN}/api/report/download`, { headers: { cookie } }))).status,
    410,
    "download sessions stop after three uses",
  );

  const duplicate = await call(webhookRequest("orders/paid", paid.order, paid.webhookId));
  assert.deepEqual(await duplicate.json(), { received: true, duplicate: true });
  assert.equal(emails.length, 1);
  const counts = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM report_tokens WHERE job_id = ?) AS token_count,
      (SELECT COUNT(*) FROM delivery_outbox WHERE job_id = ?) AS outbox_count
  `).bind(job.jobId, job.jobId).first();
  assert.equal(counts.token_count, 2);
  assert.equal(counts.outbox_count, 1);
});

test("checkout failures remain retriable and do not create paid entitlement", async () => {
  shopifyMode = "rejected";
  const job = await createJob({ checkout: false });
  const rejected = await call(new Request(`${SITE_ORIGIN}/api/report/jobs/${job.jobId}/checkout`, {
    method: "POST",
    headers: { authorization: `Bearer ${job.capability}`, origin: SITE_ORIGIN },
  }));
  assert.equal(rejected.status, 502);
  let row = await jobRow(job.jobId);
  assert.equal(row.status, "pending");
  assert.equal(row.status_reason, "shopify_cart_rejected");
  assert.equal(await db.prepare("SELECT COUNT(*) AS count FROM report_tokens WHERE job_id = ?").bind(job.jobId).first("count"), 0);

  shopifyMode = "success";
  const retry = await call(new Request(`${SITE_ORIGIN}/api/report/jobs/${job.jobId}/checkout`, {
    method: "POST",
    headers: { authorization: `Bearer ${job.capability}`, origin: SITE_ORIGIN },
  }));
  assert.equal(retry.status, 200);
  row = await jobRow(job.jobId);
  assert.equal(row.status, "checkout_created");
  assert.equal(row.status_reason, null);

  const normalizedJob = await createJob({ checkout: false });
  shopifyMode = "normalized-decimal";
  const normalized = await call(new Request(`${SITE_ORIGIN}/api/report/jobs/${normalizedJob.jobId}/checkout`, {
    method: "POST",
    headers: { authorization: `Bearer ${normalizedJob.capability}`, origin: SITE_ORIGIN },
  }));
  assert.equal(normalized.status, 200, "Shopify's equivalent 2.0 MoneyV2 value is accepted");
});

test("concurrent checkout creation produces one Shopify cart and reuses its encrypted URL", async () => {
  const job = await createJob({ checkout: false });
  const checkoutRequest = () => call(new Request(`${SITE_ORIGIN}/api/report/jobs/${job.jobId}/checkout`, {
    method: "POST",
    headers: { authorization: `Bearer ${job.capability}`, origin: SITE_ORIGIN },
  }));

  const responses = await Promise.all([checkoutRequest(), checkoutRequest()]);
  assert.ok(responses.every((response) => [200, 409].includes(response.status)));
  assert.equal(shopifyRequests.length, 1);

  const retry = await checkoutRequest();
  assert.equal(retry.status, 200);
  assert.equal(shopifyRequests.length, 1, "cached checkout URL avoids a second Shopify cart");
});

test("paid webhook rejects bad signatures and every amount, currency, variant, and paid-state mismatch", async () => {
  const signatureJob = await createJob({ checkout: false });
  const unsigned = await call(webhookRequest("orders/paid", paidOrder(signatureJob.jobId), nextId("bad-hmac"), "invalid"));
  assert.equal(unsigned.status, 401);
  assert.equal((await jobRow(signatureJob.jobId)).status, "pending");

  const invalidCases = [
    ["unexpected_variant", { variant_id: "999999999" }],
    ["unexpected_currency", { currency: "CAD" }],
    ["unexpected_total", { current_total_price: "2.01" }],
    ["order_not_paid", { financial_status: "pending" }],
    ["discount_not_allowed", { current_total_discounts: "0.01", total_discounts: "0.01" }],
    ["live_order_blocked", { test: false }],
  ];

  for (const [expectedCode, overrides] of invalidCases) {
    const job = await createJob({ checkout: false });
    const payload = paidOrder(job.jobId, overrides);
    const validation = validatePaidOrder(payload, true);
    assert.equal(validation.ok, false);
    assert.equal(validation.code, expectedCode);

    const webhookId = nextId("invalid-paid");
    if (expectedCode === "live_order_blocked") env.REPORT_TEST_ORDERS_ONLY = "true";
    const response = await call(webhookRequest("orders/paid", payload, webhookId));
    env.REPORT_TEST_ORDERS_ONLY = "false";
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true });
    const row = await jobRow(job.jobId);
    assert.equal(row.status, "review_required");
    assert.equal(row.status_reason, expectedCode);
    const delivery = await db.prepare("SELECT * FROM shopify_webhook_deliveries WHERE webhook_id = ?").bind(webhookId).first();
    assert.equal(delivery.status, "rejected");
    assert.equal(delivery.error_code, expectedCode);
  }
  assert.equal(emails.length, 0);

  const taxedJob = await createJob({ checkout: false });
  const taxedOrder = paidOrder(taxedJob.jobId, {
    id: "taxed-order",
    name: "#1601",
    lineItemId: "taxed-line",
    current_total_tax: "0.17",
    current_total_price: "2.17",
  });
  assert.equal(validatePaidOrder(taxedOrder).ok, true, "applicable Shopify tax is allowed above the exact $2 product price");
  assert.equal((await call(webhookRequest("orders/paid", taxedOrder))).status, 200);
  assert.equal((await jobRow(taxedJob.jobId)).status, "delivered");
});

test("a stale in-progress webhook is reclaimed while an active delivery asks Shopify to retry", async () => {
  const staleJob = await createJob({ checkout: false });
  const stalePayload = paidOrder(staleJob.jobId, { id: "stale-order", name: "#1501", lineItemId: "stale-line" });
  const staleRequest = webhookRequest("orders/paid", stalePayload, "stale-webhook");
  const staleBody = await staleRequest.clone().text();
  await db.prepare(`
    INSERT INTO shopify_webhook_deliveries (
      webhook_id, event_id, topic, shop_domain, payload_sha256, status,
      attempt_count, received_at, processing_started_at
    ) VALUES (?, ?, 'orders/paid', ?, ?, 'processing', 1, ?, ?)
  `).bind(
    "stale-webhook",
    staleRequest.headers.get("x-shopify-event-id"),
    SHOPIFY_STORE_DOMAIN,
    sha256(new TextEncoder().encode(staleBody)),
    now - 301,
    now - 301,
  ).run();

  const reclaimed = await call(staleRequest);
  assert.equal(reclaimed.status, 200);
  assert.equal((await jobRow(staleJob.jobId)).status, "delivered");

  const activeJob = await createJob({ checkout: false });
  const activeRequest = webhookRequest(
    "orders/paid",
    paidOrder(activeJob.jobId, { id: "active-order", name: "#1502", lineItemId: "active-line" }),
    "active-webhook",
  );
  const activeBody = await activeRequest.clone().text();
  await db.prepare(`
    INSERT INTO shopify_webhook_deliveries (
      webhook_id, event_id, topic, shop_domain, payload_sha256, status,
      attempt_count, received_at, processing_started_at
    ) VALUES (?, ?, 'orders/paid', ?, ?, 'processing', 1, ?, ?)
  `).bind(
    "active-webhook",
    activeRequest.headers.get("x-shopify-event-id"),
    SHOPIFY_STORE_DOMAIN,
    sha256(new TextEncoder().encode(activeBody)),
    now,
    now,
  ).run();

  assert.equal((await call(activeRequest)).status, 503);
  assert.equal((await jobRow(activeJob.jobId)).status, "pending");
});

test("concurrent outbox maintenance claims one delivery lease", async () => {
  const job = await createJob();
  const resendKey = env.RESEND_API_KEY;
  env.RESEND_API_KEY = "";
  const order = paidOrder(job.jobId, { id: "leased-email-order", name: "#1701", lineItemId: "leased-email-line" });
  assert.equal((await call(webhookRequest("orders/paid", order))).status, 200);
  assert.equal(emails.length, 0);
  assert.equal((await jobRow(job.jobId)).status, "paid");

  env.RESEND_API_KEY = resendKey;
  await Promise.all([service.maintenance(), service.maintenance()]);
  assert.equal(emails.length, 1);
  assert.equal((await jobRow(job.jobId)).status, "delivered");
  const outbox = await db.prepare("SELECT * FROM delivery_outbox WHERE job_id = ?").bind(job.jobId).first();
  assert.equal(outbox.status, "sent");
  assert.equal(outbox.lease_id, null);
});

test("unpaid report jobs are abandoned after 24 hours and their private object is erased", async () => {
  const job = await createJob({ checkout: false });
  const original = await jobRow(job.jobId);
  assert.ok(await reports.head(original.r2_key));

  now += 24 * 60 * 60 + 1;
  await service.maintenance();
  const abandoned = await jobRow(job.jobId);
  assert.equal(abandoned.status, "abandoned");
  assert.equal(abandoned.status_reason, "retention_expired");
  assert.equal(abandoned.r2_key, null);
  assert.equal(abandoned.pdf_sha256, null);
  assert.equal(abandoned.job_capability_hash, null);
  assert.equal(await reports.head(original.r2_key), null);
});

test("anonymous PDF job uploads are limited per Cloudflare client IP", async () => {
  const clientIp = "198.51.100.77";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await createJob({ checkout: false, clientIp });
  }
  const pdf = testPdf();
  const limited = await call(new Request(`${SITE_ORIGIN}/api/report/jobs`, {
    method: "POST",
    headers: {
      "cf-connecting-ip": clientIp,
      "content-type": "application/pdf",
      origin: SITE_ORIGIN,
      "x-life-map-pdf-pages": String(FULL_REPORT_PRODUCT.pages),
      "x-life-map-report-schema": REPORT_SCHEMA_VERSION,
      "x-life-map-pdf-sha256": sha256(pdf),
    },
    body: pdf,
  }));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "3600");
});

test("checkout-created PDFs survive Shopify's 30-day cart window and then expire", async () => {
  const payable = await createJob();
  const retained = await jobRow(payable.jobId);
  assert.equal(retained.expires_at, BASE_TIME + 32 * 24 * 60 * 60);

  now = BASE_TIME + 30 * 24 * 60 * 60;
  await service.maintenance();
  assert.equal((await jobRow(payable.jobId)).status, "checkout_created");
  assert.ok(await reports.head(retained.r2_key));
  await pay(payable, { id: "late-order", name: "#2501", lineItemId: "late-line" });
  assert.equal((await jobRow(payable.jobId)).status, "delivered");

  now = BASE_TIME;
  const abandonedCheckout = await createJob();
  const abandonedObject = (await jobRow(abandonedCheckout.jobId)).r2_key;
  now = BASE_TIME + 32 * 24 * 60 * 60 + 1;
  await service.maintenance();
  assert.equal((await jobRow(abandonedCheckout.jobId)).status, "abandoned");
  assert.equal(await reports.head(abandonedObject), null);
});

test("email access expires after 24 hours and paid report data expires after 30 days", async () => {
  const job = await createJob();
  const paid = await pay(job, { id: "expiry-order", name: "#2001", lineItemId: "expiry-line" });
  const retained = await jobRow(job.jobId);
  const r2Key = retained.r2_key;

  now += 24 * 60 * 60 + 1;
  assert.equal((await exchange(paid.token)).status, 410);
  assert.equal((await jobRow(job.jobId)).status, "delivered");
  assert.ok(await reports.head(r2Key), "the recoverable PDF remains during the 30-day period");

  now = BASE_TIME + 30 * 24 * 60 * 60 + 1;
  await service.maintenance();
  const expired = await jobRow(job.jobId);
  assert.equal(expired.status, "expired");
  assert.equal(expired.r2_key, null);
  assert.equal(expired.buyer_email_hmac, retained.buyer_email_hmac, "only a one-way recovery hash remains during metadata retention");
  assert.equal(await reports.head(r2Key), null);
});

test("refund and cancellation events revoke sessions and erase paid PDFs", async () => {
  for (const terminal of ["refunded", "cancelled"]) {
    const job = await createJob();
    const orderId = `${terminal}-order`;
    const paid = await pay(job, {
      id: orderId,
      name: terminal === "refunded" ? "#3001" : "#3002",
      lineItemId: `${terminal}-line`,
    });
    const exchangeResponse = await exchange(paid.token);
    assert.equal(exchangeResponse.status, 200);
    const cookie = sessionCookie(exchangeResponse);
    const r2Key = (await jobRow(job.jobId)).r2_key;

    const topic = terminal === "refunded" ? "refunds/create" : "orders/cancelled";
    const payload = terminal === "refunded" ? { order_id: orderId } : { id: orderId };
    const response = await call(webhookRequest(topic, payload));
    assert.equal(response.status, 200);
    const row = await jobRow(job.jobId);
    assert.equal(row.status, terminal);
    assert.equal(row.r2_key, null);
    assert.equal(await reports.head(r2Key), null);
    assert.equal(
      (await call(new Request(`${SITE_ORIGIN}/api/report/download`, { headers: { cookie } }))).status,
      410,
    );
  }
});

test("a refund arriving before the paid event never creates entitlement", async () => {
  const job = await createJob();
  const orderId = "out-of-order-refund";
  const refund = await call(webhookRequest("refunds/create", { order_id: orderId }));
  assert.equal(refund.status, 200);
  assert.equal((await jobRow(job.jobId)).status, "checkout_created");

  const paid = await call(webhookRequest("orders/paid", paidOrder(job.jobId, {
    id: orderId,
    name: "#3501",
    lineItemId: "out-of-order-line",
  })));
  assert.equal(paid.status, 200);
  assert.equal((await jobRow(job.jobId)).status, "refunded");
  assert.equal(emails.length, 0);
  assert.equal(await db.prepare("SELECT COUNT(*) AS count FROM report_tokens WHERE job_id = ?").bind(job.jobId).first("count"), 0);
});

test("access recovery is enumeration-safe and only matching order-email pairs send a fresh link", async () => {
  const job = await createJob();
  await pay(job, { id: "recovery-order", name: "#4001", lineItemId: "recovery-line" });
  assert.equal(emails.length, 1);

  const requestRecovery = (email) => call(new Request(`${SITE_ORIGIN}/api/report/access/request`, {
    method: "POST",
    headers: {
      "cf-connecting-ip": "203.0.113.5",
      "content-type": "application/json",
      origin: SITE_ORIGIN,
    },
    body: JSON.stringify({ orderNumber: "4001", email }),
  }));

  const mismatch = await requestRecovery("other@example.com");
  assert.equal(mismatch.status, 202);
  assert.deepEqual(await mismatch.json(), { accepted: true });
  assert.equal(emails.length, 1);

  const match = await requestRecovery("BUYER@example.com");
  assert.equal(match.status, 202);
  assert.deepEqual(await match.json(), { accepted: true });
  assert.equal(emails.length, 2);
  assert.equal(emails[1].body.to[0], "buyer@example.com");
  assert.match(emails[1].init.headers["idempotency-key"], /^report-recovery-/);

  const recoveryToken = accessTokenFromEmail(emails[1]);
  const recovered = await exchange(recoveryToken);
  assert.equal(recovered.status, 200);
  sessionCookie(recovered);
});

test("paid-launch readiness remains closed when any required production control is missing", async () => {
  assert.equal(hasPaidLaunchConfiguration(env), true);
  const blockedConfigurations = [
    { key: "DB", value: undefined },
    { key: "REPORTS", value: undefined },
    { key: "PAID_REPORTS_ENABLED", value: "false" },
    { key: "SHOPIFY_STOREFRONT_TOKEN", value: "" },
    { key: "SHOPIFY_WEBHOOK_SECRET", value: "short" },
    { key: "REPORT_TOKEN_SECRET", value: "short" },
    { key: "REPORT_EMAIL_HASH_SECRET", value: "short" },
    { key: "REPORT_RATE_LIMIT_SECRET", value: "short" },
    { key: "REPORT_PII_KEY", value: "invalid" },
    { key: "RESEND_API_KEY", value: "" },
    { key: "REPORT_DELIVERY_FROM", value: "" },
    { key: "NEXT_PUBLIC_SUPPORT_EMAIL", value: "" },
    { key: "NEXT_PUBLIC_SUPPORT_EMAIL", value: "support@example.com" },
    { key: "REPORT_WEBHOOKS_CONFIGURED", value: "false" },
    { key: "REPORT_CLEANUP_CONFIGURED", value: "false" },
    { key: "REPORT_PUBLIC_ACCESS_CONFIRMED", value: "false" },
    { key: "REPORT_POLICIES_CONFIRMED", value: "false" },
    { key: "REPORT_TEST_ORDERS_ONLY", value: "true" },
    { key: "NEXT_PUBLIC_SITE_URL", value: "https://example.com" },
  ];
  for (const { key, value } of blockedConfigurations) {
    assert.equal(hasPaidLaunchConfiguration({ ...env, [key]: value }), false, `${key} must fail closed`);
  }

  const gated = new ReportService({ ...env, REPORT_WEBHOOKS_CONFIGURED: "false" }, { now: () => now, fetcher: fakeFetch });
  const context = executionContext();
  const readiness = await gated.handle(new Request(`${SITE_ORIGIN}/api/report/readiness`), context);
  await Promise.all(context.promises);
  assert.equal(readiness.status, 200);
  assert.deepEqual(await readiness.json(), { available: false });

  const create = await gated.handle(new Request(`${SITE_ORIGIN}/api/report/jobs`, {
    method: "POST",
    headers: { "content-type": "application/pdf", origin: SITE_ORIGIN },
    body: testPdf(),
  }), executionContext());
  assert.equal(create.status, 503);
  assert.equal(shopifyRequests.length, 0);
});

test("local production mode fails closed when Worker bindings are absent", async () => {
  const context = executionContext();
  const passThrough = await handleReportRequest(
    new Request(`${SITE_ORIGIN}/report/access`),
    undefined,
    context,
  );
  assert.equal(passThrough, null);

  const readiness = await handleReportRequest(
    new Request(`${SITE_ORIGIN}/api/report/readiness`),
    undefined,
    context,
  );
  assert.equal(readiness.status, 200);
  assert.deepEqual(await readiness.json(), { available: false });
});
