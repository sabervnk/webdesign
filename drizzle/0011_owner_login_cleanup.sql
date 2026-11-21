DELETE FROM classer_sessions WHERE account_id IN (SELECT id FROM classer_accounts WHERE id IN (SELECT owner_id FROM classer_administrator_ids) AND username<>'admin');
--> statement-breakpoint
DELETE FROM classer_recovery WHERE account_id IN (SELECT id FROM classer_accounts WHERE id IN (SELECT owner_id FROM classer_administrator_ids) AND username<>'admin');
--> statement-breakpoint
DELETE FROM classer_email_recovery WHERE account_id IN (SELECT id FROM classer_accounts WHERE id IN (SELECT owner_id FROM classer_administrator_ids) AND username<>'admin');
--> statement-breakpoint
DELETE FROM classer_accounts WHERE id IN (SELECT owner_id FROM classer_administrator_ids) AND username<>'admin';
