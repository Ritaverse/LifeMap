CREATE TABLE `delivery_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`token_id` text NOT NULL,
	`kind` text NOT NULL,
	`generation` integer DEFAULT 1 NOT NULL,
	`recipient_ciphertext` blob,
	`recipient_nonce` blob,
	`encryption_key_version` integer NOT NULL,
	`provider_idempotency_key` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`last_error_code` text,
	`created_at` integer NOT NULL,
	`sent_at` integer,
	FOREIGN KEY (`job_id`) REFERENCES `report_jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`token_id`) REFERENCES `report_tokens`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "delivery_kind_check" CHECK("delivery_outbox"."kind" IN ('initial_delivery','access_recovery')),
	CONSTRAINT "delivery_status_check" CHECK("delivery_outbox"."status" IN ('pending','sending','sent','failed','expired'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `delivery_provider_key_idx` ON `delivery_outbox` (`provider_idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `delivery_generation_idx` ON `delivery_outbox` (`job_id`,`kind`,`generation`);--> statement-breakpoint
CREATE INDEX `delivery_outbox_due_idx` ON `delivery_outbox` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `recovery_rate_limits` (
	`key_hmac` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`attempt_count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `report_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`product_key` text NOT NULL,
	`expected_variant_gid` text NOT NULL,
	`expected_variant_numeric_id` text NOT NULL,
	`expected_amount_cents` integer NOT NULL,
	`expected_currency` text NOT NULL,
	`r2_key` text,
	`pdf_sha256` text,
	`pdf_size_bytes` integer,
	`pdf_page_count` integer,
	`report_schema_version` text NOT NULL,
	`job_capability_hash` text,
	`checkout_url_ciphertext` blob,
	`checkout_url_nonce` blob,
	`shopify_order_id` text,
	`shopify_order_number` text,
	`shopify_line_item_id` text,
	`buyer_email_hmac` text,
	`refunded_cents` integer DEFAULT 0 NOT NULL,
	`status_reason` text,
	`created_at` integer NOT NULL,
	`checkout_at` integer,
	`paid_at` integer,
	`delivered_at` integer,
	`expires_at` integer NOT NULL,
	`terminal_at` integer,
	`updated_at` integer NOT NULL,
	`purge_lease_id` text,
	`purge_started_at` integer,
	`version` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "report_jobs_status_check" CHECK("report_jobs"."status" IN ('pending','checkout_created','paid','delivered','review_required','abandoned','cancelled','refunded','expired')),
	CONSTRAINT "report_jobs_product_check" CHECK("report_jobs"."product_key" = 'full-report-v1'),
	CONSTRAINT "report_jobs_amount_check" CHECK("report_jobs"."expected_amount_cents" = 200),
	CONSTRAINT "report_jobs_currency_check" CHECK("report_jobs"."expected_currency" = 'USD'),
	CONSTRAINT "report_jobs_size_check" CHECK("report_jobs"."pdf_size_bytes" IS NULL OR "report_jobs"."pdf_size_bytes" BETWEEN 1024 AND 5242880),
	CONSTRAINT "report_jobs_pages_check" CHECK("report_jobs"."pdf_page_count" IS NULL OR "report_jobs"."pdf_page_count" = 10)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_jobs_r2_key_unique` ON `report_jobs` (`r2_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `report_jobs_shopify_order_id_unique` ON `report_jobs` (`shopify_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `report_jobs_shopify_line_item_id_unique` ON `report_jobs` (`shopify_line_item_id`);--> statement-breakpoint
CREATE INDEX `report_jobs_expiry_idx` ON `report_jobs` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `report_jobs_recovery_idx` ON `report_jobs` (`shopify_order_number`,`buyer_email_hmac`);--> statement-breakpoint
CREATE TABLE `report_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`purpose` text NOT NULL,
	`max_uses` integer NOT NULL,
	`use_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`revoked_at` integer,
	FOREIGN KEY (`job_id`) REFERENCES `report_jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "report_tokens_purpose_check" CHECK("report_tokens"."purpose" IN ('email_link','download_session')),
	CONSTRAINT "report_tokens_uses_check" CHECK("report_tokens"."max_uses" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_tokens_hash_idx` ON `report_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `report_tokens_expiry_idx` ON `report_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `shopify_webhook_deliveries` (
	`webhook_id` text PRIMARY KEY NOT NULL,
	`event_id` text,
	`topic` text NOT NULL,
	`shop_domain` text NOT NULL,
	`shopify_order_id` text,
	`job_id` text,
	`payload_sha256` text NOT NULL,
	`status` text NOT NULL,
	`attempt_count` integer DEFAULT 1 NOT NULL,
	`error_code` text,
	`received_at` integer NOT NULL,
	`processing_started_at` integer NOT NULL,
	`processed_at` integer,
	FOREIGN KEY (`job_id`) REFERENCES `report_jobs`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "webhook_topic_check" CHECK("shopify_webhook_deliveries"."topic" IN ('orders/paid','orders/cancelled','refunds/create')),
	CONSTRAINT "webhook_status_check" CHECK("shopify_webhook_deliveries"."status" IN ('processing','processed','rejected','retryable'))
);
--> statement-breakpoint
CREATE INDEX `webhook_event_idx` ON `shopify_webhook_deliveries` (`event_id`);--> statement-breakpoint
CREATE INDEX `webhook_retention_idx` ON `shopify_webhook_deliveries` (`processed_at`);