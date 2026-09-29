import { PDFDocument } from "pdf-lib";

import {
  FULL_REPORT_PRODUCT,
  REPORT_JOB_LINE_ATTRIBUTE,
  REPORT_SCHEMA_VERSION,
  SHOPIFY_STOREFRONT_API_VERSION,
  SHOPIFY_STORE_DOMAIN,
} from "../app/lib/report-product.ts";
import { resolveSupportEmail } from "../app/lib/site-config.ts";
import {
  decryptString,
  deriveEmailLinkToken,
  encryptString,
  hmacHex,
  randomToken,
  sha256Hex,
  type BinaryLike,
  verifyShopifyHmac,
} from "./report-crypto.ts";
import {
  D1ReportStore,
  type DeliveryOutboxRow,
  type ReportJobRow,
  type ReportWorkerEnv,
} from "./report-store.ts";

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MIN_PDF_BYTES = 1024;
const MAX_WEBHOOK_BYTES = 1024 * 1024;
const ABANDONED_AFTER_SECONDS = 24 * 60 * 60;
const CHECKOUT_RETENTION_SECONDS = 32 * 24 * 60 * 60;
const PAID_RETENTION_SECONDS = 30 * 24 * 60 * 60;
const EMAIL_LINK_SECONDS = 24 * 60 * 60;
const DOWNLOAD_SESSION_SECONDS = 15 * 60;
const SHOPIFY_WEBHOOK_TOPICS = new Set(["orders/paid", "orders/cancelled", "refunds/create"]);
const JOB_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CREATE_FULL_REPORT_CART_MUTATION = `mutation CreateFullReportCart($input: CartInput!) {
  cartCreate(input: $input) {
    cart {
      checkoutUrl
      totalQuantity
      lines(first: 2) {
        nodes {
          quantity
          attributes { key value }
          merchandise { ... on ProductVariant { id } }
        }
      }
      cost {
        subtotalAmount { amount currencyCode }
        totalAmount { amount currencyCode }
      }
    }
    userErrors { field message }
    warnings { code message }
  }
}`;

interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

interface ShopifyCartResponse {
  data?: {
    cartCreate?: {
      cart?: {
        checkoutUrl: string;
        totalQuantity: number;
        lines: {
          nodes: Array<{
            quantity: number;
            attributes: Array<{ key: string; value: string }>;
            merchandise: { id: string };
          }>;
        };
        cost: {
          subtotalAmount: { amount: string; currencyCode: string };
          totalAmount: { amount: string; currencyCode: string };
        };
      } | null;
      userErrors: Array<{ field?: string[]; message: string }>;
      warnings: Array<{ code?: string; message: string }>;
    };
  };
  errors?: Array<{ message: string }>;
}

interface ShopifyOrderProperty {
  name?: string;
  key?: string;
  value?: string;
}

interface ShopifyLineItem {
  id?: number | string;
  variant_id?: number | string | null;
  quantity?: number;
  current_quantity?: number;
  price?: string;
  final_line_price?: string;
  properties?: ShopifyOrderProperty[];
  discount_allocations?: unknown[];
}

interface ShopifyOrderPayload {
  id?: number | string;
  name?: string;
  order_number?: number | string;
  contact_email?: string | null;
  email?: string | null;
  currency?: string;
  financial_status?: string;
  current_subtotal_price?: string;
  current_total_price?: string;
  current_total_tax?: string;
  current_total_discounts?: string;
  total_discounts?: string;
  current_shipping_price_set?: ShopifyMoneySet | null;
  current_total_additional_fees_set?: ShopifyMoneySet | null;
  current_total_duties_set?: ShopifyMoneySet | null;
  test?: boolean;
  line_items?: ShopifyLineItem[];
}

interface ShopifyMoneySet {
  shop_money?: { amount?: string; currency_code?: string };
}

interface ShopifyRefundPayload {
  order_id?: number | string;
}

interface ValidatedPaidOrder {
  jobId: string;
  orderId: string;
  orderNumber: string;
  lineItemId: string;
  email: string;
}

export interface ReportServiceDependencies {
  now?: () => number;
  fetcher?: typeof fetch;
}

function epochSeconds() {
  return Math.floor(Date.now() / 1000);
}

function json(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(body), { status, headers });
}

function publicOrigin(env: ReportWorkerEnv) {
  try {
    const url = new URL(env.NEXT_PUBLIC_SITE_URL || "https://lifemap.fyi");
    if (url.protocol !== "https:") return "https://lifemap.fyi";
    return url.origin;
  } catch {
    return "https://lifemap.fyi";
  }
}

function isSameOriginRequest(request: Request, env: ReportWorkerEnv) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === publicOrigin(env) || (
      new URL(origin).hostname === "localhost" && new URL(request.url).hostname === "localhost"
    );
  } catch {
    return false;
  }
}

function isStrongSecret(value: string | undefined) {
  return Boolean(value && value.length >= 32);
}

function hasValidPiiKey(value: string | undefined) {
  if (!value) return false;
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    return atob(normalized).length === 32;
  } catch {
    return false;
  }
}

export function hasPaidLaunchConfiguration(env: ReportWorkerEnv) {
  return env.PAID_REPORTS_ENABLED === "true"
    && Boolean(env.DB && env.REPORTS)
    && Boolean(env.SHOPIFY_STOREFRONT_TOKEN)
    && isStrongSecret(env.SHOPIFY_WEBHOOK_SECRET)
    && isStrongSecret(env.REPORT_TOKEN_SECRET)
    && isStrongSecret(env.REPORT_EMAIL_HASH_SECRET)
    && isStrongSecret(env.REPORT_RATE_LIMIT_SECRET)
    && hasValidPiiKey(env.REPORT_PII_KEY)
    && Boolean(env.RESEND_API_KEY && env.REPORT_DELIVERY_FROM)
    && env.REPORT_WEBHOOKS_CONFIGURED === "true"
    && env.REPORT_CLEANUP_CONFIGURED === "true"
    && env.REPORT_PUBLIC_ACCESS_CONFIRMED === "true"
    && env.REPORT_POLICIES_CONFIRMED === "true"
    && env.REPORT_TEST_ORDERS_ONLY === "false"
    && Boolean(resolveSupportEmail(env.NEXT_PUBLIC_SUPPORT_EMAIL))
    && publicOrigin(env) === "https://lifemap.fyi";
}

function cents(value: unknown) {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function shopMoneyCents(value: ShopifyMoneySet | null | undefined, required = false) {
  if (!value) return required ? null : 0;
  if (value.shop_money?.currency_code !== FULL_REPORT_PRODUCT.currencyCode) return null;
  return cents(value.shop_money.amount);
}

export function normalizeOrderNumber(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim().toUpperCase().replace(/\s+/g, "");
  if (!/^#?[A-Z0-9-]{1,32}$/.test(normalized)) return null;
  return normalized.startsWith("#") ? normalized : `#${normalized}`;
}

function jobIdFromLine(line: ShopifyLineItem) {
  const property = line.properties?.find((item) => (item.name ?? item.key) === REPORT_JOB_LINE_ATTRIBUTE);
  const value = property?.value?.trim() ?? "";
  return JOB_ID_PATTERN.test(value) ? value : null;
}

export function validatePaidOrder(payload: ShopifyOrderPayload, testOrdersOnly = false):
  | { ok: true; value: ValidatedPaidOrder }
  | { ok: false; code: string; jobId: string | null } {
  const lines = payload.line_items ?? [];
  const linesWithJobs = lines.map((line) => ({ line, jobId: jobIdFromLine(line) })).filter((item) => item.jobId);
  const jobId = linesWithJobs[0]?.jobId ?? null;
  const fail = (code: string) => ({ ok: false as const, code, jobId });
  if (lines.length !== 1 || linesWithJobs.length !== 1) return fail("unexpected_line_items");
  const line = linesWithJobs[0].line;
  if (String(line.variant_id ?? "") !== FULL_REPORT_PRODUCT.variantNumericId) return fail("unexpected_variant");
  if (line.quantity !== 1 || (line.current_quantity !== undefined && line.current_quantity !== 1)) return fail("unexpected_quantity");
  if (cents(line.price) !== FULL_REPORT_PRODUCT.amountCents) return fail("unexpected_line_amount");
  if (line.final_line_price !== undefined && cents(line.final_line_price) !== FULL_REPORT_PRODUCT.amountCents) return fail("unexpected_final_line_amount");
  if ((line.discount_allocations?.length ?? 0) > 0) return fail("discount_not_allowed");
  if (payload.currency !== FULL_REPORT_PRODUCT.currencyCode) return fail("unexpected_currency");
  if (payload.financial_status !== "paid") return fail("order_not_paid");
  if (cents(payload.current_subtotal_price) !== FULL_REPORT_PRODUCT.amountCents) return fail("unexpected_subtotal");
  const taxCents = cents(payload.current_total_tax);
  if (taxCents === null) return fail("invalid_tax_amount");
  if (shopMoneyCents(payload.current_shipping_price_set, true) !== 0) return fail("shipping_not_allowed");
  if (shopMoneyCents(payload.current_total_additional_fees_set) !== 0) return fail("additional_fees_not_allowed");
  if (shopMoneyCents(payload.current_total_duties_set) !== 0) return fail("duties_not_allowed");
  if (cents(payload.current_total_price) !== FULL_REPORT_PRODUCT.amountCents + taxCents) return fail("unexpected_total");
  if (cents(payload.current_total_discounts ?? payload.total_discounts ?? "0.00") !== 0) return fail("discount_not_allowed");
  if (testOrdersOnly && payload.test !== true) return fail("live_order_blocked");
  const email = normalizeEmail(payload.contact_email ?? payload.email);
  if (!email) return fail("missing_delivery_email");
  const orderId = payload.id === undefined ? "" : String(payload.id);
  const orderNumber = normalizeOrderNumber(payload.name ?? payload.order_number);
  const lineItemId = line.id === undefined ? "" : String(line.id);
  if (!orderId || !orderNumber || !lineItemId || !jobId) return fail("missing_order_identity");
  return { ok: true, value: { jobId, orderId, orderNumber, lineItemId, email } };
}

function checkoutUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || (url.hostname !== SHOPIFY_STORE_DOMAIN && url.hostname !== "checkout.shopify.com")) {
    throw new Error("unsafe_checkout_host");
  }
  return url.toString();
}

function cartInput(jobId: string) {
  return {
    lines: [{
      merchandiseId: FULL_REPORT_PRODUCT.variantId,
      quantity: 1,
      attributes: [{ key: REPORT_JOB_LINE_ATTRIBUTE, value: jobId }],
    }],
  };
}

function validateCart(body: ShopifyCartResponse, jobId: string) {
  const payload = body.data?.cartCreate;
  const error = payload?.userErrors?.[0]?.message ?? body.errors?.[0]?.message;
  if (error || !payload?.cart) throw new Error("shopify_cart_rejected");
  const cart = payload.cart;
  const line = cart.lines.nodes[0];
  const hasJob = line?.attributes.some((item) => item.key === REPORT_JOB_LINE_ATTRIBUTE && item.value === jobId);
  const valid = cart.totalQuantity === 1
    && cart.lines.nodes.length === 1
    && line.quantity === 1
    && line.merchandise.id === FULL_REPORT_PRODUCT.variantId
    && hasJob
    && cents(cart.cost.subtotalAmount.amount) === FULL_REPORT_PRODUCT.amountCents
    && cart.cost.subtotalAmount.currencyCode === FULL_REPORT_PRODUCT.currencyCode
    && cents(cart.cost.totalAmount.amount) === FULL_REPORT_PRODUCT.amountCents
    && cart.cost.totalAmount.currencyCode === FULL_REPORT_PRODUCT.currencyCode;
  if (!valid) throw new Error("shopify_cart_mismatch");
  return checkoutUrl(cart.checkoutUrl);
}

function bearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

async function boundedJson<T>(request: Request, maxBytes = 4096): Promise<T | null> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > maxBytes) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function accessStoragePresent(env: ReportWorkerEnv) {
  return Boolean(env.DB && env.REPORTS);
}

function recoveryConfigurationPresent(env: ReportWorkerEnv) {
  return Boolean(
    accessStoragePresent(env) && isStrongSecret(env.REPORT_TOKEN_SECRET)
    && isStrongSecret(env.REPORT_EMAIL_HASH_SECRET) && hasValidPiiKey(env.REPORT_PII_KEY),
  );
}

function deliveryConfigurationPresent(env: ReportWorkerEnv) {
  return Boolean(
    accessStoragePresent(env) && isStrongSecret(env.REPORT_TOKEN_SECRET)
    && hasValidPiiKey(env.REPORT_PII_KEY) && env.RESEND_API_KEY && env.REPORT_DELIVERY_FROM,
  );
}

export class ReportService {
  private readonly store: D1ReportStore | null;
  private readonly now: () => number;
  private readonly fetcher: typeof fetch;

  constructor(
    private readonly env: ReportWorkerEnv,
    dependencies: ReportServiceDependencies = {},
  ) {
    this.store = env.DB ? new D1ReportStore(env.DB) : null;
    this.now = dependencies.now ?? epochSeconds;
    this.fetcher = dependencies.fetcher ?? fetch;
  }

  async handle(request: Request, context: ExecutionContextLike): Promise<Response | null> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/report/") && url.pathname !== "/api/webhooks/shopify") return null;

    if (this.store && this.env.REPORTS) {
      context.waitUntil(this.maintenance().catch(() => undefined));
    }

    if (request.method === "GET" && url.pathname === "/api/report/readiness") return this.readiness();
    if (request.method === "POST" && url.pathname === "/api/report/jobs") return this.createJob(request);
    const checkoutMatch = url.pathname.match(/^\/api\/report\/jobs\/([0-9a-f-]+)\/checkout$/i);
    if (request.method === "POST" && checkoutMatch) return this.createCheckout(request, checkoutMatch[1]);
    if (request.method === "POST" && url.pathname === "/api/webhooks/shopify") return this.webhook(request, context);
    if (request.method === "POST" && url.pathname === "/api/report/access/request") return this.requestAccess(request, context);
    if (request.method === "POST" && url.pathname === "/api/report/access/exchange") return this.exchangeAccess(request);
    if (request.method === "GET" && url.pathname === "/api/report/download") return this.download(request);
    return json({ error: "没有找到这个报告接口。" }, 404);
  }

  private async readiness() {
    const available = hasPaidLaunchConfiguration(this.env)
      && Boolean(this.store && await this.store.schemaReady());
    return json({ available });
  }

  private async createJob(request: Request) {
    if (!hasPaidLaunchConfiguration(this.env) || !this.store || !this.env.REPORTS) {
      return json({ error: "付费报告仍在完成上线检查，暂时不能结账。" }, 503);
    }
    if (!isSameOriginRequest(request, this.env)) return json({ error: "请求来源无法验证。" }, 403);
    const clientKey = request.headers.get("cf-connecting-ip") ?? "unknown";
    const uploadRateKey = await hmacHex(this.env.REPORT_RATE_LIMIT_SECRET!, `report-upload|${clientKey}`);
    if (!await this.store.rateAllowed(uploadRateKey, this.now(), 3, 3600)) {
      return json({ error: "报告生成请求过于频繁，请一小时后再试。" }, 429, { "retry-after": "3600" });
    }
    if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/pdf") {
      return json({ error: "报告文件格式不正确。" }, 415);
    }
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_PDF_BYTES) return json({ error: "报告文件超过大小限制。" }, 413);
    const pdf = new Uint8Array(await request.arrayBuffer());
    if (pdf.byteLength < MIN_PDF_BYTES || pdf.byteLength > MAX_PDF_BYTES) {
      return json({ error: "报告文件大小不在允许范围内。" }, 422);
    }
    const prefix = new TextDecoder().decode(pdf.subarray(0, 5));
    const suffix = new TextDecoder().decode(pdf.subarray(Math.max(0, pdf.length - 64))).trimEnd();
    if (prefix !== "%PDF-" || !suffix.endsWith("%%EOF")) return json({ error: "报告文件未通过 PDF 校验。" }, 422);
    const pageCount = Number(request.headers.get("x-life-map-pdf-pages"));
    const schemaVersion = request.headers.get("x-life-map-report-schema");
    if (pageCount !== FULL_REPORT_PRODUCT.pages || schemaVersion !== REPORT_SCHEMA_VERSION) {
      return json({ error: "报告版本与商品不匹配。" }, 422);
    }
    try {
      const parsed = await PDFDocument.load(pdf, { ignoreEncryption: false, updateMetadata: false });
      if (parsed.getPageCount() !== FULL_REPORT_PRODUCT.pages) {
        return json({ error: "报告页数与商品不匹配。" }, 422);
      }
    } catch {
      return json({ error: "报告文件未通过 PDF 结构校验。" }, 422);
    }
    const digest = await sha256Hex(pdf);
    if (request.headers.get("x-life-map-pdf-sha256") !== digest) {
      return json({ error: "报告文件完整性校验失败。" }, 422);
    }

    const id = crypto.randomUUID();
    const capability = randomToken();
    const capabilityHash = await sha256Hex(capability);
    const now = this.now();
    const expiresAt = now + ABANDONED_AFTER_SECONDS;
    const r2Key = `reports/${id}.pdf`;
    await this.env.REPORTS.put(r2Key, pdf, {
      httpMetadata: { contentType: "application/pdf" },
      customMetadata: { sha256: digest, pages: String(pageCount), schema: REPORT_SCHEMA_VERSION },
    });
    try {
      await this.store.insertPendingJob({
        id,
        r2Key,
        sha256: digest,
        size: pdf.byteLength,
        pageCount,
        schemaVersion,
        capabilityHash,
        createdAt: now,
        expiresAt,
        variantGid: FULL_REPORT_PRODUCT.variantId,
        variantNumericId: FULL_REPORT_PRODUCT.variantNumericId,
        productKey: FULL_REPORT_PRODUCT.key,
        amountCents: FULL_REPORT_PRODUCT.amountCents,
        currency: FULL_REPORT_PRODUCT.currencyCode,
      });
    } catch {
      await this.env.REPORTS.delete(r2Key);
      return json({ error: "报告暂时无法进入安全交付队列。" }, 503);
    }
    return json({ jobId: id, capability, expiresAt: new Date(expiresAt * 1000).toISOString() }, 201);
  }

  private async createCheckout(request: Request, jobId: string) {
    if (!hasPaidLaunchConfiguration(this.env) || !this.store || !this.env.REPORTS) {
      return json({ error: "付费报告仍在完成上线检查，暂时不能结账。" }, 503);
    }
    if (!isSameOriginRequest(request, this.env) || !JOB_ID_PATTERN.test(jobId)) {
      return json({ error: "请求来源或报告编号无法验证。" }, 403);
    }
    const job = await this.store.getJob(jobId);
    const capability = bearerToken(request);
    if (!job || !capability || await sha256Hex(capability) !== job.job_capability_hash) {
      return json({ error: "报告编号已经失效，请重新生成。" }, 403);
    }
    const now = this.now();
    if (!job.r2_key || job.expires_at <= now || !["pending", "checkout_created"].includes(job.status)) {
      return json({ error: "这份报告已经过期或不能再次结账。" }, 410);
    }
    if (job.status === "checkout_created" && job.checkout_url_ciphertext && job.checkout_url_nonce) {
      const url = await decryptString(this.env.REPORT_PII_KEY!, job.checkout_url_ciphertext, job.checkout_url_nonce);
      return json({ checkoutUrl: checkoutUrl(url), amount: FULL_REPORT_PRODUCT.price, currencyCode: FULL_REPORT_PRODUCT.currencyCode });
    }
    const object = await this.env.REPORTS.head(job.r2_key);
    if (!object || object.size !== job.pdf_size_bytes || object.customMetadata?.sha256 !== job.pdf_sha256) {
      await this.store.markCheckoutError(jobId, "report_object_mismatch", now);
      return json({ error: "私人报告文件未通过交付校验，请重新生成。" }, 409);
    }
    const checkoutLeaseId = await this.store.claimCheckout(jobId, now);
    if (!checkoutLeaseId) {
      const current = await this.store.getJob(jobId);
      if (current?.status === "checkout_created" && current.checkout_url_ciphertext && current.checkout_url_nonce) {
        const url = await decryptString(
          this.env.REPORT_PII_KEY!,
          current.checkout_url_ciphertext,
          current.checkout_url_nonce,
        );
        return json({ checkoutUrl: checkoutUrl(url), amount: FULL_REPORT_PRODUCT.price, currencyCode: FULL_REPORT_PRODUCT.currencyCode });
      }
      return json({ error: "Shopify 结账正在建立，请稍后重试。" }, 409);
    }
    try {
      const response = await this.fetcher(`https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_STOREFRONT_API_VERSION}/graphql.json`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-shopify-storefront-access-token": this.env.SHOPIFY_STOREFRONT_TOKEN!,
        },
        body: JSON.stringify({ query: CREATE_FULL_REPORT_CART_MUTATION, variables: { input: cartInput(jobId) } }),
      });
      if (!response.ok) throw new Error("shopify_http_error");
      const url = validateCart(await response.json() as ShopifyCartResponse, jobId);
      const encrypted = await encryptString(this.env.REPORT_PII_KEY!, url);
      if (!await this.store.markCheckoutCreated(
        jobId,
        checkoutLeaseId,
        encrypted.ciphertext,
        encrypted.nonce,
        now,
        now + CHECKOUT_RETENTION_SECONDS,
      )) {
        throw new Error("checkout_state_conflict");
      }
      return json({ checkoutUrl: url, amount: FULL_REPORT_PRODUCT.price, currencyCode: FULL_REPORT_PRODUCT.currencyCode });
    } catch (error) {
      const code = error instanceof Error ? error.message.slice(0, 64) : "checkout_failed";
      await this.store.releaseCheckout(jobId, checkoutLeaseId, code, now);
      return json({ error: "Shopify 结账暂时不可用，请稍后重试。" }, 502);
    }
  }

  private async webhook(request: Request, context: ExecutionContextLike) {
    if (!this.store || !this.env.REPORTS || !isStrongSecret(this.env.SHOPIFY_WEBHOOK_SECRET)) {
      return json({ error: "Webhook 尚未配置。" }, 503);
    }
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_WEBHOOK_BYTES) return json({ error: "Webhook 请求过大。" }, 413);
    const body = new Uint8Array(await request.arrayBuffer());
    if (body.byteLength > MAX_WEBHOOK_BYTES) return json({ error: "Webhook 请求过大。" }, 413);
    if (!await verifyShopifyHmac(this.env.SHOPIFY_WEBHOOK_SECRET!, body, request.headers.get("x-shopify-hmac-sha256"))) {
      return json({ error: "Webhook 签名无效。" }, 401);
    }
    const topic = request.headers.get("x-shopify-topic") ?? "";
    const shop = request.headers.get("x-shopify-shop-domain") ?? "";
    const webhookId = request.headers.get("x-shopify-webhook-id") ?? "";
    const eventId = request.headers.get("x-shopify-event-id");
    const apiVersion = request.headers.get("x-shopify-api-version");
    if (!SHOPIFY_WEBHOOK_TOPICS.has(topic) || shop !== SHOPIFY_STORE_DOMAIN || !webhookId || (apiVersion && apiVersion !== SHOPIFY_STOREFRONT_API_VERSION)) {
      return json({ error: "Webhook 来源信息无效。" }, 400);
    }
    const now = this.now();
    const claim = await this.store.claimWebhook({
      webhookId,
      eventId,
      topic,
      shop,
      payloadSha256: await sha256Hex(body),
      now,
    });
    if (claim === "duplicate") return json({ received: true, duplicate: true });
    if (claim === "busy") return json({ error: "Webhook 正在处理，将由 Shopify 重试。" }, 503);
    let payload: ShopifyOrderPayload | ShopifyRefundPayload;
    try {
      payload = JSON.parse(new TextDecoder().decode(body)) as ShopifyOrderPayload | ShopifyRefundPayload;
    } catch {
      await this.store.finishWebhook(webhookId, "rejected", now, "invalid_json");
      return json({ received: true });
    }

    if (topic === "orders/paid") {
      const validation = validatePaidOrder(payload as ShopifyOrderPayload, this.env.REPORT_TEST_ORDERS_ONLY === "true");
      if (!validation.ok) {
        if (validation.jobId) await this.store.markReviewRequired(validation.jobId, validation.code, now);
        await this.store.finishWebhook(webhookId, "rejected", now, validation.code, validation.jobId);
        return json({ received: true });
      }
      const order = validation.value;
      const job = await this.store.getJob(order.jobId);
      const priorTerminalEvent = await this.store.getPriorTerminalOrderTopic(order.orderId);
      if (priorTerminalEvent) {
        if (job) {
          const terminalStatus = priorTerminalEvent.topic === "refunds/create" ? "refunded" : "cancelled";
          await this.purgeJob(job, terminalStatus, `preceded_by_${priorTerminalEvent.topic}`, now);
        }
        await this.store.finishWebhook(
          webhookId,
          "processed",
          now,
          "terminal_order_event_already_received",
          job?.id ?? order.jobId,
          order.orderId,
        );
        return json({ received: true });
      }
      const reportObject = job?.r2_key ? await this.env.REPORTS.head(job.r2_key) : null;
      const jobMatches = job
        && ["pending", "checkout_created"].includes(job.status)
        && job.expected_variant_numeric_id === FULL_REPORT_PRODUCT.variantNumericId
        && job.expected_amount_cents === FULL_REPORT_PRODUCT.amountCents
        && job.expected_currency === FULL_REPORT_PRODUCT.currencyCode
        && job.expires_at > now
        && !job.purge_lease_id
        && reportObject
        && reportObject.size === job.pdf_size_bytes
        && reportObject.customMetadata?.sha256 === job.pdf_sha256;
      if (!jobMatches) {
        if (job) await this.store.markReviewRequired(job.id, "job_or_object_mismatch", now);
        await this.store.finishWebhook(webhookId, "rejected", now, "job_or_object_mismatch", order.jobId, order.orderId);
        return json({ received: true });
      }
      const tokenId = crypto.randomUUID();
      const tokenExpiresAt = now + EMAIL_LINK_SECONDS;
      const rawToken = await deriveEmailLinkToken(this.env.REPORT_TOKEN_SECRET!, tokenId, tokenExpiresAt);
      const recipient = await encryptString(this.env.REPORT_PII_KEY!, order.email);
      try {
        await this.store.grantPaid({
          jobId: order.jobId,
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          lineItemId: order.lineItemId,
          emailHmac: await hmacHex(this.env.REPORT_EMAIL_HASH_SECRET!, order.email),
          paidAt: now,
          expiresAt: now + PAID_RETENTION_SECONDS,
          tokenId,
          tokenHash: await sha256Hex(rawToken),
          tokenExpiresAt,
          outboxId: crypto.randomUUID(),
          recipientCiphertext: recipient.ciphertext,
          recipientNonce: recipient.nonce,
          providerIdempotencyKey: `report-paid-${order.orderId}`,
        });
        await this.store.finishWebhook(webhookId, "processed", now, null, order.jobId, order.orderId);
        context.waitUntil(this.processOutbox());
      } catch {
        const existing = await this.store.getJobByOrderId(order.orderId);
        if (existing && ["paid", "delivered"].includes(existing.status)) {
          await this.store.finishWebhook(webhookId, "processed", now, "duplicate_order", existing.id, order.orderId);
        } else {
          await this.store.finishWebhook(webhookId, "retryable", now, "grant_failed", order.jobId, order.orderId);
          return json({ error: "Webhook 将重试。" }, 503);
        }
      }
      return json({ received: true });
    }

    const orderId = topic === "refunds/create"
      ? String((payload as ShopifyRefundPayload).order_id ?? "")
      : String((payload as ShopifyOrderPayload).id ?? "");
    let job = orderId ? await this.store.getJobByOrderId(orderId) : null;
    if (!job && topic === "orders/cancelled") {
      const cancelledOrder = payload as ShopifyOrderPayload;
      const lines = cancelledOrder.line_items ?? [];
      const line = lines.length === 1 ? lines[0] : null;
      const pendingJobId = line
        && String(line.variant_id ?? "") === FULL_REPORT_PRODUCT.variantNumericId
        ? jobIdFromLine(line)
        : null;
      if (pendingJobId) job = await this.store.getJob(pendingJobId);
    }
    if (!job) {
      await this.store.finishWebhook(webhookId, "processed", now, "unmatched_terminal_order", null, orderId || null);
      return json({ received: true });
    }
    const status = topic === "refunds/create" ? "refunded" : "cancelled";
    const purged = await this.purgeJob(job, status, topic, now);
    await this.store.finishWebhook(
      webhookId,
      purged ? "processed" : "retryable",
      now,
      purged ? null : "purge_failed",
      job.id,
      orderId,
    );
    return purged ? json({ received: true }) : json({ error: "Webhook 将重试。" }, 503);
  }

  private async requestAccess(request: Request, context: ExecutionContextLike) {
    const accepted = () => json({ accepted: true }, 202);
    if (!recoveryConfigurationPresent(this.env) || !this.store || !isSameOriginRequest(request, this.env)) return accepted();
    const input = await boundedJson<{ orderNumber?: unknown; email?: unknown }>(request);
    const email = normalizeEmail(input?.email);
    const orderNumber = normalizeOrderNumber(input?.orderNumber);
    if (!email || !orderNumber) return accepted();
    const now = this.now();
    const clientKey = request.headers.get("cf-connecting-ip") ?? "unknown";
    const rateKey = await hmacHex(this.env.REPORT_EMAIL_HASH_SECRET!, `${clientKey}|${orderNumber}`);
    if (!await this.store.recoveryRateAllowed(rateKey, now)) return accepted();
    const emailHmac = await hmacHex(this.env.REPORT_EMAIL_HASH_SECRET!, email);
    const job = await this.store.getRecoverableJob(orderNumber, emailHmac, now);
    if (!job) return accepted();
    const generation = await this.store.nextRecoveryGeneration(job.id);
    const tokenId = crypto.randomUUID();
    const tokenExpiresAt = now + EMAIL_LINK_SECONDS;
    const rawToken = await deriveEmailLinkToken(this.env.REPORT_TOKEN_SECRET!, tokenId, tokenExpiresAt);
    const recipient = await encryptString(this.env.REPORT_PII_KEY!, email);
    try {
      await this.store.enqueueRecovery({
        jobId: job.id,
        tokenId,
        tokenHash: await sha256Hex(rawToken),
        tokenExpiresAt,
        outboxId: crypto.randomUUID(),
        generation,
        recipientCiphertext: recipient.ciphertext,
        recipientNonce: recipient.nonce,
        providerIdempotencyKey: `report-recovery-${job.id}-${generation}`,
        now,
      });
      context.waitUntil(this.processOutbox());
    } catch {
      // Keep the response enumeration-safe. A later request can retry.
    }
    return accepted();
  }

  private async exchangeAccess(request: Request) {
    if (!accessStoragePresent(this.env) || !this.store || !isSameOriginRequest(request, this.env)) {
      return json({ error: "这个下载链接无效或已经过期。" }, 403);
    }
    const input = await boundedJson<{ token?: unknown }>(request);
    const rawToken = typeof input?.token === "string" && /^[a-f0-9]{64}$/i.test(input.token) ? input.token : null;
    if (!rawToken) return json({ error: "这个下载链接无效或已经过期。" }, 410);
    const now = this.now();
    const token = await this.store.resolveToken(await sha256Hex(rawToken), "email_link", now);
    if (!token || !await this.store.consumeToken(token.id, now)) {
      return json({ error: "这个下载链接无效或已经过期。" }, 410);
    }
    const session = randomToken();
    await this.store.createDownloadSession({
      id: crypto.randomUUID(),
      jobId: token.job_id,
      tokenHash: await sha256Hex(session),
      now,
      expiresAt: now + DOWNLOAD_SESSION_SECONDS,
    });
    return json({ available: true }, 200, {
      "set-cookie": `__Host-life_map_report_session=${encodeURIComponent(session)}; Path=/; Max-Age=${DOWNLOAD_SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
    });
  }

  private async download(request: Request) {
    if (!this.store || !this.env.REPORTS) return new Response("报告不可用。", { status: 503 });
    const session = cookieValue(request, "__Host-life_map_report_session");
    if (!session) return new Response("下载会话无效或已经过期。", { status: 401 });
    const now = this.now();
    const token = await this.store.resolveToken(await sha256Hex(session), "download_session", now);
    if (!token?.r2_key || !await this.store.consumeToken(token.id, now)) {
      return new Response("下载会话无效或已经过期。", { status: 410 });
    }
    const object = await this.env.REPORTS.get(token.r2_key);
    if (!object) return new Response("报告文件已经过期。", { status: 410 });
    return new Response(object.body, {
      headers: {
        "content-type": "application/pdf",
        "content-length": String(object.size),
        "content-disposition": "attachment; filename=\"life-map-full-report.pdf\"",
        "cache-control": "private, no-store",
        "content-security-policy": "sandbox",
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex, nofollow, noarchive",
      },
    });
  }

  private async processOutbox() {
    if (!deliveryConfigurationPresent(this.env) || !this.store) return;
    const now = this.now();
    for (const item of await this.store.dueOutbox(now)) {
      const recipientCiphertext = item.recipient_ciphertext;
      const recipientNonce = item.recipient_nonce;
      if (!recipientCiphertext || !recipientNonce) continue;
      const leaseId = await this.store.claimOutbox(item.id, now);
      if (!leaseId) continue;
      try {
        await this.sendDeliveryEmail({
          ...item,
          recipient_ciphertext: recipientCiphertext,
          recipient_nonce: recipientNonce,
        });
        await this.store.markOutboxSent(item.id, item.job_id, leaseId, this.now());
      } catch {
        const delay = Math.min(6 * 60 * 60, 60 * (2 ** Math.min(item.attempts, 8)));
        await this.store.markOutboxFailed(item.id, leaseId, "provider_error", this.now() + delay);
      }
    }
  }

  private async sendDeliveryEmail(
    item: Omit<DeliveryOutboxRow, "recipient_ciphertext" | "recipient_nonce"> & {
      recipient_ciphertext: BinaryLike;
      recipient_nonce: BinaryLike;
    },
  ) {
    const recipient = await decryptString(this.env.REPORT_PII_KEY!, item.recipient_ciphertext, item.recipient_nonce);
    const rawToken = await deriveEmailLinkToken(this.env.REPORT_TOKEN_SECRET!, item.token_id, item.token_expires_at);
    const accessUrl = `${publicOrigin(this.env)}/report/access#token=${encodeURIComponent(rawToken)}`;
    const response = await this.fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.env.RESEND_API_KEY}`,
        "content-type": "application/json",
        "idempotency-key": item.provider_idempotency_key,
      },
      body: JSON.stringify({
        from: this.env.REPORT_DELIVERY_FROM,
        to: [recipient],
        subject: "Your private Life Map report is ready",
        text: `Your private Life Map PDF is ready. Open this 24-hour access link: ${accessUrl}\n\nThe report remains available for recovery for 30 days. Life Map is a reflection tool, not a scientific prediction or professional advice service.`,
        html: `<p>Your private Life Map PDF is ready.</p><p><a href="${accessUrl}">Open your secure report access page</a></p><p>This link expires in 24 hours. You can request a new link for 30 days using your Shopify order number and purchase email.</p><p><small>Life Map is for personal reflection and cultural exploration, not scientific prediction or professional advice.</small></p>`,
      }),
    });
    if (!response.ok) throw new Error("email_provider_error");
  }

  private async purgeJob(job: ReportJobRow, status: "abandoned" | "cancelled" | "refunded" | "expired", reason: string, now: number) {
    if (!this.store || !this.env.REPORTS) return false;
    const leaseId = await this.store.claimPurge(job.id, now);
    if (!leaseId) return ["abandoned", "cancelled", "refunded", "expired"].includes(job.status);
    try {
      if (job.r2_key) await this.env.REPORTS.delete(job.r2_key);
      await this.store.finalizePurge(job.id, leaseId, status, reason, now);
      return true;
    } catch {
      await this.store.releasePurge(job.id, leaseId, now);
      return false;
    }
  }

  async maintenance() {
    if (!this.store || !this.env.REPORTS) return;
    await this.processOutbox();
    const now = this.now();
    for (const job of await this.store.dueJobs(now)) {
      const terminalStatus = ["pending", "checkout_created"].includes(job.status) ? "abandoned" : "expired";
      await this.purgeJob(job, terminalStatus, "retention_expired", now);
    }
    await this.store.purgeExpiredMetadata(now);
  }
}

export async function handleReportRequest(
  request: Request,
  env: ReportWorkerEnv | undefined,
  context: ExecutionContextLike,
  dependencies?: ReportServiceDependencies,
) {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/api/report/") && pathname !== "/api/webhooks/shopify") return null;

  // Vinext's local production server does not provide Worker bindings. Treat that
  // environment as a closed launch gate instead of failing every report request.
  return new ReportService(env ?? {} as ReportWorkerEnv, dependencies).handle(request, context);
}

export async function runReportMaintenance(env: ReportWorkerEnv, dependencies?: ReportServiceDependencies) {
  return new ReportService(env, dependencies).maintenance();
}
