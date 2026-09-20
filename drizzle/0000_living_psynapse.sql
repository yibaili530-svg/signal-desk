CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entries_fingerprint_unique` ON `entries` (`fingerprint`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
