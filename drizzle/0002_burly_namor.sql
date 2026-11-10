CREATE TABLE `teacher_videos` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`size` integer NOT NULL,
	`visible` integer DEFAULT 0 NOT NULL
);
