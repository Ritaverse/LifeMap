ALTER TABLE `delivery_outbox` ADD `lease_id` text;--> statement-breakpoint
ALTER TABLE `delivery_outbox` ADD `lease_started_at` integer;