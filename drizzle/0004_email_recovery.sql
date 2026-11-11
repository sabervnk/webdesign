CREATE TABLE classer_email_recovery (
 account_id TEXT PRIMARY KEY NOT NULL REFERENCES classer_accounts(id),
 challenge TEXT NOT NULL,
 code_hash TEXT NOT NULL,
 email TEXT NOT NULL,
 epoch INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 expires INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 delivered INTEGER NOT NULL DEFAULT 0,
 grant_hash TEXT,
 grant_expires INTEGER
);
--> statement-breakpoint
CREATE INDEX classer_email_recovery_expires_idx ON classer_email_recovery(expires);
--> statement-breakpoint
CREATE TABLE classer_recovery_limits (
 key TEXT PRIMARY KEY NOT NULL,
 count INTEGER NOT NULL,
 expires INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX classer_recovery_limits_expires_idx ON classer_recovery_limits(expires);
--> statement-breakpoint
CREATE UNIQUE INDEX classer_email_recovery_challenge_unique ON classer_email_recovery(challenge);
--> statement-breakpoint
CREATE UNIQUE INDEX classer_email_recovery_grant_hash_unique ON classer_email_recovery(grant_hash);

