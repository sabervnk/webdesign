CREATE TABLE `site_inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inquiries_email_date_idx` ON `site_inquiries` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `inquiries_created_idx` ON `site_inquiries` (`created_at`);--> statement-breakpoint
CREATE TABLE `teacher_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`teacher_id`) REFERENCES `teacher_public_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `articles_owner_idx` ON `teacher_articles` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `articles_published_idx` ON `teacher_articles` (`status`,`created_at`,`teacher_id`);--> statement-breakpoint
CREATE INDEX `articles_teacher_idx` ON `teacher_articles` (`teacher_id`);--> statement-breakpoint
CREATE TABLE `teacher_public_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`data` text NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_public_profiles_owner_id_unique` ON `teacher_public_profiles` (`owner_id`);--> statement-breakpoint
CREATE INDEX `public_profiles_listing_idx` ON `teacher_public_profiles` (`published`,`updated_at`);