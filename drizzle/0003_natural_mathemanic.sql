CREATE TABLE `classer_recovery` (
	`token` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`epoch` integer NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `classer_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `classer_recovery_exp_idx` ON `classer_recovery` (`expires`);--> statement-breakpoint
CREATE TABLE `classer_sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`epoch` integer NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `classer_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `classer_sessions_exp_idx` ON `classer_sessions` (`expires`);--> statement-breakpoint
CREATE TABLE `classer_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`password_hash` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`epoch` integer DEFAULT 0 NOT NULL,
	`must_change` integer DEFAULT 1 NOT NULL,
	`teacher_id` text,
	`student_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classer_accounts_username_unique` ON `classer_accounts` (`username`);--> statement-breakpoint
CREATE TABLE `classer_auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `classer_auth_limit_window_idx` ON `classer_auth_limits` (`window`);--> statement-breakpoint
CREATE TABLE `classer_site_copy` (
	`id` integer PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
