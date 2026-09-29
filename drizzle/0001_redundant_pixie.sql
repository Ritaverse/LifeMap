ALTER TABLE `report_jobs` ADD `checkout_lease_id` text;--> statement-breakpoint
ALTER TABLE `report_jobs` ADD `checkout_lease_started_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_event_topic_unique` ON `shopify_webhook_deliveries` (`event_id`,`topic`);