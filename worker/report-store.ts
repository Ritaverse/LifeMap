import type { FULL_REPORT_PRODUCT } from "../app/lib/report-product.ts";
import type { BinaryLike } from "./report-crypto.ts";

export type ReportJobStatus =
  | "pending"
  | "checkout_created"
  | "paid"
  | "delivered"
  | "review_required"
  | "abandoned"
  | "cancelled"
  | "refunded"
  | "expired";

export interface D1ResultLike {
  success: boolean;
  meta?: { changes?: number };
}

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<D1ResultLike>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<D1ResultLike[]>;
}

export interface R2ObjectBodyLike {
  body: ReadableStream;
  size: number;
  httpMetadata?: { contentType?: string };
}

export interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | ReadableStream,
    options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  head(key: string): Promise<{ size: number; customMetadata?: Record<string, string> } | null>;
  delete(key: string): Promise<void>;
}

export interface ReportWorkerEnv {
  ASSETS: { fetch(input: Request | URL | string, init?: RequestInit): Promise<Response> };
  DB?: D1DatabaseLike;
  REPORTS?: R2BucketLike;
  PAID_REPORTS_ENABLED?: string;
  SHOPIFY_STOREFRONT_TOKEN?: string;
  SHOPIFY_WEBHOOK_SECRET?: string;
  REPORT_TOKEN_SECRET?: string;
  REPORT_EMAIL_HASH_SECRET?: string;
  REPORT_RATE_LIMIT_SECRET?: string;
  REPORT_PII_KEY?: string;
  RESEND_API_KEY?: string;
  REPORT_DELIVERY_FROM?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_SUPPORT_EMAIL?: string;
  REPORT_WEBHOOKS_CONFIGURED?: string;
  REPORT_CLEANUP_CONFIGURED?: string;
  REPORT_PUBLIC_ACCESS_CONFIRMED?: string;
  REPORT_POLICIES_CONFIRMED?: string;
  REPORT_TEST_ORDERS_ONLY?: string;
}

export interface ReportJobRow {
  id: string;
  status: ReportJobStatus;
  product_key: typeof FULL_REPORT_PRODUCT.key;
  expected_variant_gid: string;
  expected_variant_numeric_id: string;
  expected_amount_cents: number;
  expected_currency: string;
  r2_key: string | null;
  pdf_sha256: string | null;
  pdf_size_bytes: number | null;
  pdf_page_count: number | null;
  report_schema_version: string;
  job_capability_hash: string | null;
  checkout_url_ciphertext: BinaryLike | null;
  checkout_url_nonce: BinaryLike | null;
  checkout_lease_id: string | null;
  checkout_lease_started_at: number | null;
  shopify_order_id: string | null;
  shopify_order_number: string | null;
  shopify_line_item_id: string | null;
  buyer_email_hmac: string | null;
  status_reason: string | null;
  created_at: number;
  checkout_at: number | null;
  paid_at: number | null;
  delivered_at: number | null;
  expires_at: number;
  terminal_at: number | null;
  updated_at: number;
  purge_lease_id: string | null;
  purge_started_at: number | null;
}

export interface ReportTokenRow {
  id: string;
  job_id: string;
  token_hash: string;
  purpose: "email_link" | "download_session";
  max_uses: number;
  use_count: number;
  expires_at: number;
  revoked_at: number | null;
  status: ReportJobStatus;
  r2_key: string | null;
  job_expires_at: number;
  purge_lease_id: string | null;
}

export interface DeliveryOutboxRow {
  id: string;
  job_id: string;
  token_id: string;
  token_expires_at: number;
  recipient_ciphertext: BinaryLike | null;
  recipient_nonce: BinaryLike | null;
  provider_idempotency_key: string;
  attempts: number;
}

export interface PendingJobInput {
  id: string;
  r2Key: string;
  sha256: string;
  size: number;
  pageCount: number;
  schemaVersion: string;
  capabilityHash: string;
  createdAt: number;
  expiresAt: number;
  variantGid: string;
  variantNumericId: string;
  productKey: string;
  amountCents: number;
  currency: string;
}

export class D1ReportStore {
  constructor(private readonly db: D1DatabaseLike) {}

  async schemaReady() {
    try {
      await this.db.prepare(`
        SELECT id, checkout_lease_id, checkout_lease_started_at FROM report_jobs LIMIT 1
      `).first();
      await this.db.prepare(`
        SELECT id, lease_id, lease_started_at FROM delivery_outbox LIMIT 1
      `).first();
      const schema = await this.db.prepare(`
        SELECT type, name FROM sqlite_master WHERE
          (type = 'table' AND name IN (
            'report_jobs', 'report_tokens', 'delivery_outbox',
            'shopify_webhook_deliveries', 'recovery_rate_limits'
          )) OR (type = 'index' AND name = 'webhook_event_topic_unique')
      `).all<{ type: string; name: string }>();
      const names = new Set(schema.results.map((item) => `${item.type}:${item.name}`));
      return [
        "table:report_jobs",
        "table:report_tokens",
        "table:delivery_outbox",
        "table:shopify_webhook_deliveries",
        "table:recovery_rate_limits",
        "index:webhook_event_topic_unique",
      ].every((name) => names.has(name));
    } catch {
      return false;
    }
  }

  async insertPendingJob(input: PendingJobInput) {
    await this.db.prepare(`
      INSERT INTO report_jobs (
        id, status, product_key, expected_variant_gid, expected_variant_numeric_id,
        expected_amount_cents, expected_currency, r2_key, pdf_sha256, pdf_size_bytes,
        pdf_page_count, report_schema_version, job_capability_hash, created_at,
        expires_at, updated_at
      ) VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      input.id,
      input.productKey,
      input.variantGid,
      input.variantNumericId,
      input.amountCents,
      input.currency,
      input.r2Key,
      input.sha256,
      input.size,
      input.pageCount,
      input.schemaVersion,
      input.capabilityHash,
      input.createdAt,
      input.expiresAt,
      input.createdAt,
    ).run();
  }

  getJob(id: string) {
    return this.db.prepare("SELECT * FROM report_jobs WHERE id = ?").bind(id).first<ReportJobRow>();
  }

  getJobByOrderId(orderId: string) {
    return this.db.prepare("SELECT * FROM report_jobs WHERE shopify_order_id = ?").bind(orderId).first<ReportJobRow>();
  }

  getPriorTerminalOrderTopic(orderId: string) {
    return this.db.prepare(`
      SELECT topic FROM shopify_webhook_deliveries
      WHERE shopify_order_id = ? AND topic IN ('orders/cancelled', 'refunds/create')
        AND status = 'processed'
      ORDER BY received_at ASC LIMIT 1
    `).bind(orderId).first<{ topic: "orders/cancelled" | "refunds/create" }>();
  }

  getRecoverableJob(orderNumber: string, emailHmac: string, now: number) {
    return this.db.prepare(`
      SELECT * FROM report_jobs
      WHERE shopify_order_number = ? AND buyer_email_hmac = ?
        AND status IN ('paid', 'delivered') AND expires_at > ? AND purge_lease_id IS NULL
      LIMIT 1
    `).bind(orderNumber, emailHmac, now).first<ReportJobRow>();
  }

  async claimCheckout(id: string, now: number) {
    const leaseId = crypto.randomUUID();
    const result = await this.db.prepare(`
      UPDATE report_jobs SET checkout_lease_id = ?, checkout_lease_started_at = ?,
        updated_at = ?, version = version + 1
      WHERE id = ? AND status = 'pending' AND expires_at > ? AND purge_lease_id IS NULL
        AND (checkout_lease_id IS NULL OR checkout_lease_started_at < ?)
    `).bind(leaseId, now, now, id, now, now - 300).run();
    return (result.meta?.changes ?? 0) > 0 ? leaseId : null;
  }

  async markCheckoutCreated(
    id: string,
    leaseId: string,
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    now: number,
    expiresAt: number,
  ) {
    const result = await this.db.prepare(`
      UPDATE report_jobs SET status = 'checkout_created', checkout_url_ciphertext = ?,
        checkout_url_nonce = ?, checkout_at = COALESCE(checkout_at, ?), status_reason = NULL,
        expires_at = ?, checkout_lease_id = NULL, checkout_lease_started_at = NULL,
        updated_at = ?, version = version + 1
      WHERE id = ? AND status = 'pending' AND checkout_lease_id = ? AND expires_at > ?
        AND purge_lease_id IS NULL
    `).bind(ciphertext, nonce, now, expiresAt, now, id, leaseId, now).run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async releaseCheckout(id: string, leaseId: string, code: string, now: number) {
    await this.db.prepare(`
      UPDATE report_jobs SET checkout_lease_id = NULL, checkout_lease_started_at = NULL,
        status_reason = ?, updated_at = ?, version = version + 1
      WHERE id = ? AND status = 'pending' AND checkout_lease_id = ?
    `).bind(code, now, id, leaseId).run();
  }

  async markCheckoutError(id: string, code: string, now: number) {
    await this.db.prepare(`
      UPDATE report_jobs SET status_reason = ?, updated_at = ?, version = version + 1
      WHERE id = ? AND status IN ('pending', 'checkout_created')
    `).bind(code, now, id).run();
  }

  async claimWebhook(input: {
    webhookId: string;
    eventId: string | null;
    topic: string;
    shop: string;
    payloadSha256: string;
    now: number;
  }): Promise<"claimed" | "duplicate" | "busy"> {
    try {
      await this.db.prepare(`
        INSERT INTO shopify_webhook_deliveries (
          webhook_id, event_id, topic, shop_domain, payload_sha256, status,
          attempt_count, received_at, processing_started_at
        ) VALUES (?, ?, ?, ?, ?, 'processing', 1, ?, ?)
      `).bind(
        input.webhookId,
        input.eventId,
        input.topic,
        input.shop,
        input.payloadSha256,
        input.now,
        input.now,
      ).run();
      return "claimed";
    } catch {
      // Resolve the unique-key conflict below. The webhook ID is Shopify's
      // delivery idempotency key; event ID + topic adds replay protection.
    }

    const existingByWebhook = await this.db.prepare(`
      SELECT webhook_id, status, processing_started_at FROM shopify_webhook_deliveries
      WHERE webhook_id = ? LIMIT 1
    `).bind(input.webhookId).first<{ webhook_id: string; status: string; processing_started_at: number }>();
    const existingByEvent = !existingByWebhook && input.eventId
      ? await this.db.prepare(`
          SELECT webhook_id, status, processing_started_at FROM shopify_webhook_deliveries
          WHERE event_id = ? AND topic = ? LIMIT 1
        `).bind(input.eventId, input.topic).first<{ webhook_id: string; status: string; processing_started_at: number }>()
      : null;
    const existing = existingByWebhook ?? existingByEvent;
    if (!existing) return "busy";
    if (existing.status === "processed" || existing.status === "rejected") return "duplicate";
    if (existing.webhook_id !== input.webhookId) return "busy";
    if (existing.status === "processing" && existing.processing_started_at >= input.now - 300) return "busy";

    const reclaimed = await this.db.prepare(`
      UPDATE shopify_webhook_deliveries SET status = 'processing', attempt_count = attempt_count + 1,
        error_code = NULL, processing_started_at = ?, processed_at = NULL
      WHERE webhook_id = ? AND (
        status = 'retryable' OR (status = 'processing' AND processing_started_at < ?)
      )
    `).bind(input.now, input.webhookId, input.now - 300).run();
    return (reclaimed.meta?.changes ?? 0) > 0 ? "claimed" : "busy";
  }

  async finishWebhook(
    webhookId: string,
    status: "processed" | "rejected" | "retryable",
    now: number,
    errorCode: string | null,
    jobId: string | null = null,
    orderId: string | null = null,
  ) {
    await this.db.prepare(`
      UPDATE shopify_webhook_deliveries SET status = ?, error_code = ?, job_id = ?,
        shopify_order_id = ?, processed_at = ? WHERE webhook_id = ?
    `).bind(status, errorCode, jobId, orderId, now, webhookId).run();
  }

  async markReviewRequired(id: string, reason: string, now: number) {
    await this.db.prepare(`
      UPDATE report_jobs SET status = 'review_required', status_reason = ?, updated_at = ?,
        version = version + 1 WHERE id = ? AND status IN ('pending', 'checkout_created')
    `).bind(reason, now, id).run();
  }

  async grantPaid(input: {
    jobId: string;
    orderId: string;
    orderNumber: string;
    lineItemId: string;
    emailHmac: string;
    paidAt: number;
    expiresAt: number;
    tokenId: string;
    tokenHash: string;
    tokenExpiresAt: number;
    outboxId: string;
    recipientCiphertext: Uint8Array;
    recipientNonce: Uint8Array;
    providerIdempotencyKey: string;
  }) {
    const statements = [
      this.db.prepare(`
        UPDATE report_jobs SET status = 'paid', shopify_order_id = ?, shopify_order_number = ?,
          shopify_line_item_id = ?, buyer_email_hmac = ?, paid_at = ?, expires_at = ?,
          status_reason = NULL, checkout_lease_id = NULL, checkout_lease_started_at = NULL,
          updated_at = ?, version = version + 1
        WHERE id = ? AND status IN ('pending', 'checkout_created') AND purge_lease_id IS NULL
      `).bind(
        input.orderId,
        input.orderNumber,
        input.lineItemId,
        input.emailHmac,
        input.paidAt,
        input.expiresAt,
        input.paidAt,
        input.jobId,
      ),
      this.db.prepare(`
        INSERT INTO report_tokens (
          id, job_id, token_hash, purpose, max_uses, use_count, created_at, expires_at
        ) SELECT ?, id, ?, 'email_link', 1, 0, ?, ? FROM report_jobs
        WHERE id = ? AND status = 'paid'
      `).bind(input.tokenId, input.tokenHash, input.paidAt, input.tokenExpiresAt, input.jobId),
      this.db.prepare(`
        INSERT INTO delivery_outbox (
          id, job_id, token_id, kind, generation, recipient_ciphertext, recipient_nonce,
          encryption_key_version, provider_idempotency_key, status, attempts,
          next_attempt_at, created_at
        ) SELECT ?, ?, ?, 'initial_delivery', 1, ?, ?, 1, ?, 'pending', 0, ?, ?
        WHERE EXISTS (SELECT 1 FROM report_jobs WHERE id = ? AND status = 'paid')
      `).bind(
        input.outboxId,
        input.jobId,
        input.tokenId,
        input.recipientCiphertext,
        input.recipientNonce,
        input.providerIdempotencyKey,
        input.paidAt,
        input.paidAt,
        input.jobId,
      ),
    ];
    await this.db.batch(statements);
  }

  async nextRecoveryGeneration(jobId: string) {
    const result = await this.db.prepare(`
      SELECT COALESCE(MAX(generation), 1) + 1 AS generation FROM delivery_outbox WHERE job_id = ?
    `).bind(jobId).first<{ generation: number }>();
    return result?.generation ?? 2;
  }

  async enqueueRecovery(input: {
    jobId: string;
    tokenId: string;
    tokenHash: string;
    tokenExpiresAt: number;
    outboxId: string;
    generation: number;
    recipientCiphertext: Uint8Array;
    recipientNonce: Uint8Array;
    providerIdempotencyKey: string;
    now: number;
  }) {
    await this.db.batch([
      this.db.prepare(`
        INSERT INTO report_tokens (id, job_id, token_hash, purpose, max_uses, use_count, created_at, expires_at)
        VALUES (?, ?, ?, 'email_link', 1, 0, ?, ?)
      `).bind(input.tokenId, input.jobId, input.tokenHash, input.now, input.tokenExpiresAt),
      this.db.prepare(`
        INSERT INTO delivery_outbox (
          id, job_id, token_id, kind, generation, recipient_ciphertext, recipient_nonce,
          encryption_key_version, provider_idempotency_key, status, attempts,
          next_attempt_at, created_at
        ) VALUES (?, ?, ?, 'access_recovery', ?, ?, ?, 1, ?, 'pending', 0, ?, ?)
      `).bind(
        input.outboxId,
        input.jobId,
        input.tokenId,
        input.generation,
        input.recipientCiphertext,
        input.recipientNonce,
        input.providerIdempotencyKey,
        input.now,
        input.now,
      ),
    ]);
  }

  async dueOutbox(now: number, limit = 10) {
    const result = await this.db.prepare(`
      SELECT o.id, o.job_id, o.token_id, t.expires_at AS token_expires_at,
        o.recipient_ciphertext, o.recipient_nonce, o.provider_idempotency_key, o.attempts
      FROM delivery_outbox o JOIN report_tokens t ON t.id = o.token_id
      JOIN report_jobs j ON j.id = o.job_id
      WHERE o.status IN ('pending', 'failed', 'sending') AND o.next_attempt_at <= ?
        AND t.expires_at > ? AND t.revoked_at IS NULL
        AND j.status IN ('paid', 'delivered') AND j.purge_lease_id IS NULL
      ORDER BY o.next_attempt_at ASC LIMIT ?
    `).bind(now, now, limit).all<DeliveryOutboxRow>();
    return result.results;
  }

  async claimOutbox(id: string, now: number) {
    const leaseId = crypto.randomUUID();
    const result = await this.db.prepare(`
      UPDATE delivery_outbox SET status = 'sending', attempts = attempts + 1,
        next_attempt_at = ?, lease_id = ?, lease_started_at = ?
      WHERE id = ? AND next_attempt_at <= ? AND (
        status IN ('pending', 'failed') OR
        (status = 'sending' AND (lease_started_at IS NULL OR lease_started_at < ?))
      )
    `).bind(now + 300, leaseId, now, id, now, now - 300).run();
    return (result.meta?.changes ?? 0) > 0 ? leaseId : null;
  }

  async markOutboxSent(outboxId: string, jobId: string, leaseId: string, now: number) {
    const result = await this.db.prepare(`
      UPDATE delivery_outbox SET status = 'sent', sent_at = ?, recipient_ciphertext = NULL,
        recipient_nonce = NULL, last_error_code = NULL, lease_id = NULL, lease_started_at = NULL
      WHERE id = ? AND status = 'sending' AND lease_id = ?
    `).bind(now, outboxId, leaseId).run();
    if ((result.meta?.changes ?? 0) === 0) return false;
    await this.db.prepare(`
      UPDATE report_jobs SET status = 'delivered', delivered_at = COALESCE(delivered_at, ?),
        updated_at = ?, version = version + 1 WHERE id = ? AND status = 'paid'
    `).bind(now, now, jobId).run();
    return true;
  }

  async markOutboxFailed(id: string, leaseId: string, errorCode: string, nextAttemptAt: number) {
    await this.db.prepare(`
      UPDATE delivery_outbox SET status = 'failed', last_error_code = ?, next_attempt_at = ?,
        lease_id = NULL, lease_started_at = NULL
      WHERE id = ? AND status = 'sending' AND lease_id = ?
    `).bind(errorCode, nextAttemptAt, id, leaseId).run();
  }

  resolveToken(tokenHash: string, purpose: ReportTokenRow["purpose"], now: number) {
    return this.db.prepare(`
      SELECT t.*, j.status, j.r2_key, j.expires_at AS job_expires_at, j.purge_lease_id
      FROM report_tokens t JOIN report_jobs j ON j.id = t.job_id
      WHERE t.token_hash = ? AND t.purpose = ? AND t.expires_at > ?
        AND t.revoked_at IS NULL AND t.use_count < t.max_uses
        AND j.status IN ('paid', 'delivered') AND j.expires_at > ?
        AND j.purge_lease_id IS NULL
      LIMIT 1
    `).bind(tokenHash, purpose, now, now).first<ReportTokenRow>();
  }

  async consumeToken(id: string, now: number) {
    const result = await this.db.prepare(`
      UPDATE report_tokens SET use_count = use_count + 1, used_at = ?
      WHERE id = ? AND revoked_at IS NULL AND expires_at > ? AND use_count < max_uses
    `).bind(now, id, now).run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async createDownloadSession(input: {
    id: string;
    jobId: string;
    tokenHash: string;
    now: number;
    expiresAt: number;
  }) {
    await this.db.prepare(`
      INSERT INTO report_tokens (id, job_id, token_hash, purpose, max_uses, use_count, created_at, expires_at)
      VALUES (?, ?, ?, 'download_session', 3, 0, ?, ?)
    `).bind(input.id, input.jobId, input.tokenHash, input.now, input.expiresAt).run();
  }

  async claimPurge(id: string, now: number) {
    const leaseId = crypto.randomUUID();
    const result = await this.db.prepare(`
      UPDATE report_jobs SET purge_lease_id = ?, purge_started_at = ?, updated_at = ?
      WHERE id = ? AND (purge_lease_id IS NULL OR purge_started_at < ?)
        AND status IN ('pending', 'checkout_created', 'paid', 'delivered', 'review_required')
    `).bind(leaseId, now, now, id, now - 300).run();
    return (result.meta?.changes ?? 0) > 0 ? leaseId : null;
  }

  async finalizePurge(id: string, leaseId: string, status: "abandoned" | "cancelled" | "refunded" | "expired", reason: string, now: number) {
    await this.db.batch([
      this.db.prepare("UPDATE report_tokens SET revoked_at = ? WHERE job_id = ? AND revoked_at IS NULL").bind(now, id),
      this.db.prepare(`
        UPDATE report_jobs SET status = ?, status_reason = ?, r2_key = NULL, pdf_sha256 = NULL,
          pdf_size_bytes = NULL, job_capability_hash = NULL, checkout_url_ciphertext = NULL,
          checkout_url_nonce = NULL, checkout_lease_id = NULL, checkout_lease_started_at = NULL,
          terminal_at = ?, updated_at = ?, purge_lease_id = NULL, purge_started_at = NULL,
          version = version + 1 WHERE id = ? AND purge_lease_id = ?
      `).bind(status, reason, now, now, id, leaseId),
    ]);
  }

  async releasePurge(id: string, leaseId: string, now: number) {
    await this.db.prepare(`
      UPDATE report_jobs SET purge_lease_id = NULL, purge_started_at = NULL, updated_at = ?
      WHERE id = ? AND purge_lease_id = ?
    `).bind(now, id, leaseId).run();
  }

  async dueJobs(now: number, limit = 25) {
    const result = await this.db.prepare(`
      SELECT * FROM report_jobs WHERE expires_at <= ? AND purge_lease_id IS NULL
        AND status IN ('pending', 'checkout_created', 'paid', 'delivered', 'review_required')
      ORDER BY expires_at ASC LIMIT ?
    `).bind(now, limit).all<ReportJobRow>();
    return result.results;
  }

  async purgeExpiredMetadata(now: number) {
    await this.db.batch([
      this.db.prepare("DELETE FROM report_tokens WHERE expires_at < ?").bind(now - 86400),
      this.db.prepare("DELETE FROM delivery_outbox WHERE created_at < ?").bind(now - 30 * 86400),
      this.db.prepare("DELETE FROM shopify_webhook_deliveries WHERE processed_at < ?").bind(now - 30 * 86400),
      this.db.prepare(`
        DELETE FROM report_jobs WHERE terminal_at IS NOT NULL AND terminal_at < ?
      `).bind(now - 90 * 86400),
      this.db.prepare("DELETE FROM recovery_rate_limits WHERE expires_at < ?").bind(now),
    ]);
  }

  async rateAllowed(keyHmac: string, now: number, maxAttempts: number, windowSeconds = 3600) {
    const existing = await this.db.prepare(
      "SELECT window_started_at, attempt_count FROM recovery_rate_limits WHERE key_hmac = ?",
    ).bind(keyHmac).first<{ window_started_at: number; attempt_count: number }>();
    if (!existing || existing.window_started_at < now - windowSeconds) {
      await this.db.prepare(`
        INSERT INTO recovery_rate_limits (key_hmac, window_started_at, attempt_count, expires_at)
        VALUES (?, ?, 1, ?) ON CONFLICT(key_hmac) DO UPDATE SET
          window_started_at = excluded.window_started_at, attempt_count = 1, expires_at = excluded.expires_at
      `).bind(keyHmac, now, now + windowSeconds).run();
      return true;
    }
    if (existing.attempt_count >= maxAttempts) return false;
    await this.db.prepare(
      "UPDATE recovery_rate_limits SET attempt_count = attempt_count + 1 WHERE key_hmac = ?",
    ).bind(keyHmac).run();
    return true;
  }

  recoveryRateAllowed(keyHmac: string, now: number) {
    return this.rateAllowed(keyHmac, now, 5, 3600);
  }
}
