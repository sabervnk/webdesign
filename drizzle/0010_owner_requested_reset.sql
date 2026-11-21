CREATE TABLE classer_deleted_identities (owner_id TEXT PRIMARY KEY NOT NULL);
--> statement-breakpoint
CREATE TABLE classer_media_deletions (object_key TEXT PRIMARY KEY NOT NULL);
--> statement-breakpoint
INSERT INTO classer_deleted_identities SELECT id FROM (SELECT id FROM classer_accounts UNION SELECT owner_id AS id FROM teacher_workspaces UNION SELECT owner_id AS id FROM teacher_public_profiles) WHERE id NOT IN (SELECT owner_id FROM classer_administrator_ids) AND id NOT IN (SELECT id FROM classer_accounts WHERE username='admin' AND role='admin');
--> statement-breakpoint
INSERT OR IGNORE INTO classer_media_deletions SELECT object_key FROM teacher_videos UNION SELECT object_key FROM classer_blog_media UNION SELECT 'avatars-v1/'||owner_id FROM classer_deleted_identities;
--> statement-breakpoint
DELETE FROM classer_sessions WHERE account_id IN (SELECT owner_id FROM classer_deleted_identities);
--> statement-breakpoint
DELETE FROM classer_recovery WHERE account_id IN (SELECT owner_id FROM classer_deleted_identities);
--> statement-breakpoint
DELETE FROM classer_email_recovery WHERE account_id IN (SELECT owner_id FROM classer_deleted_identities);
--> statement-breakpoint
DELETE FROM classer_direct_messages;
--> statement-breakpoint
DELETE FROM teacher_articles;
--> statement-breakpoint
DELETE FROM classer_blog_media;
--> statement-breakpoint
DELETE FROM classer_blog_categories;
--> statement-breakpoint
DELETE FROM teacher_videos;
--> statement-breakpoint
DELETE FROM teacher_public_profiles;
--> statement-breakpoint
DELETE FROM classer_commissions;
--> statement-breakpoint
DELETE FROM site_inquiries WHERE json_extract(data,'$.kind')='class';
--> statement-breakpoint
DELETE FROM teacher_workspaces WHERE owner_id IN (SELECT owner_id FROM classer_deleted_identities);
--> statement-breakpoint
UPDATE teacher_workspaces SET data=json_set(data,'$.students',json('[]'),'$.sessions',json('[]'),'$.assessments',json('[]'),'$.messages',json('[]'),'$.demo',json('false')),version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
--> statement-breakpoint
DELETE FROM classer_accounts WHERE id IN (SELECT owner_id FROM classer_deleted_identities);
