CREATE TABLE IF NOT EXISTS classer_commissions (owner_id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS classer_translations (id TEXT PRIMARY KEY NOT NULL, translated TEXT NOT NULL, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS inquiries_referral_owner_idx ON site_inquiries(json_extract(data,'$.teacherOwnerId'));

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS classer_translation_limits (id TEXT PRIMARY KEY NOT NULL, count INTEGER NOT NULL DEFAULT 0);
