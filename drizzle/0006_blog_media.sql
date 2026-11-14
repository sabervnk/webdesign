CREATE TABLE classer_blog_categories (id text PRIMARY KEY NOT NULL,owner_id text NOT NULL,name text NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX classer_blog_categories_owner_name ON classer_blog_categories(owner_id,name);
--> statement-breakpoint
CREATE TABLE classer_blog_media (id text PRIMARY KEY NOT NULL,owner_id text NOT NULL,object_key text NOT NULL,type text NOT NULL,size integer NOT NULL,name text NOT NULL,created_at text NOT NULL);
--> statement-breakpoint
CREATE INDEX classer_blog_media_owner_idx ON classer_blog_media(owner_id);
