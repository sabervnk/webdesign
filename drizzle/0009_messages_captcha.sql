CREATE TABLE IF NOT EXISTS classer_direct_messages (id TEXT PRIMARY KEY NOT NULL, teacher_id TEXT NOT NULL, student_id TEXT NOT NULL, sender_id TEXT NOT NULL, sender_role TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL, teacher_read_at TEXT, student_read_at TEXT);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS direct_messages_thread_idx ON classer_direct_messages(teacher_id,student_id,created_at,id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS classer_captchas (id TEXT PRIMARY KEY NOT NULL, answer_hash TEXT NOT NULL, binding_hash TEXT NOT NULL, expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS captcha_expiry_idx ON classer_captchas(expires);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS classer_security_limits (id TEXT PRIMARY KEY NOT NULL, count INTEGER NOT NULL, expires INTEGER NOT NULL);
