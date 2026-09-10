PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` text NOT NULL,
	`author_id` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`description` text NOT NULL,
	`body_markdown` text NOT NULL,
	`series_id` integer,
	`series_position` integer,
	`noindex` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "posts_series_position_check" CHECK(("__new_posts"."series_id" IS NULL AND "__new_posts"."series_position" IS NULL) OR ("__new_posts"."series_id" IS NOT NULL AND "__new_posts"."series_position" IS NOT NULL))
);
--> statement-breakpoint
INSERT INTO `__new_posts`("id", "asset_id", "author_id", "title", "subtitle", "description", "body_markdown", "series_id", "series_position", "noindex", "published_at", "created_at", "updated_at")
SELECT
	"id",
	lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
	"author_id", "title", "subtitle", "description", "body_markdown", "series_id", "series_position", "noindex",
	CASE WHEN "draft" THEN NULL ELSE "published_at" END,
	"created_at", "updated_at"
FROM `posts`;--> statement-breakpoint
DROP TABLE `posts`;--> statement-breakpoint
ALTER TABLE `__new_posts` RENAME TO `posts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `posts_asset_id_unique` ON `posts` (`asset_id`);--> statement-breakpoint
CREATE INDEX `posts_published_idx` ON `posts` (`published_at`,`id`) WHERE "posts"."published_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `posts_author_idx` ON `posts` (`author_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `posts_series_position_idx` ON `posts` (`series_id`,`series_position`);--> statement-breakpoint
CREATE INDEX `post_categories_category_idx` ON `post_categories` (`category_id`,`post_id`);--> statement-breakpoint
CREATE INDEX `post_tags_tag_idx` ON `post_tags` (`tag_id`,`post_id`);--> statement-breakpoint
ALTER TABLE `session` DROP COLUMN `impersonated_by`;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `role`;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `banned`;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `ban_reason`;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `ban_expires`;--> statement-breakpoint
ALTER TABLE `categories` DROP COLUMN `created_at`;--> statement-breakpoint
ALTER TABLE `categories` DROP COLUMN `updated_at`;--> statement-breakpoint
ALTER TABLE `series` DROP COLUMN `created_at`;--> statement-breakpoint
ALTER TABLE `series` DROP COLUMN `updated_at`;
--> statement-breakpoint
CREATE TRIGGER `posts_fts_insert` AFTER INSERT ON `posts` BEGIN
	INSERT INTO `posts_fts` (`rowid`, `title`, `subtitle`, `description`, `body_markdown`)
	VALUES (new.`id`, new.`title`, new.`subtitle`, new.`description`, new.`body_markdown`);
END;
--> statement-breakpoint
CREATE TRIGGER `posts_fts_delete` AFTER DELETE ON `posts` BEGIN
	INSERT INTO `posts_fts` (`posts_fts`, `rowid`, `title`, `subtitle`, `description`, `body_markdown`)
	VALUES ('delete', old.`id`, old.`title`, old.`subtitle`, old.`description`, old.`body_markdown`);
END;
--> statement-breakpoint
CREATE TRIGGER `posts_fts_update` AFTER UPDATE OF `title`, `subtitle`, `description`, `body_markdown` ON `posts` BEGIN
	INSERT INTO `posts_fts` (`posts_fts`, `rowid`, `title`, `subtitle`, `description`, `body_markdown`)
	VALUES ('delete', old.`id`, old.`title`, old.`subtitle`, old.`description`, old.`body_markdown`);
	INSERT INTO `posts_fts` (`rowid`, `title`, `subtitle`, `description`, `body_markdown`)
	VALUES (new.`id`, new.`title`, new.`subtitle`, new.`description`, new.`body_markdown`);
END;
--> statement-breakpoint
INSERT INTO `posts_fts`(`posts_fts`) VALUES('rebuild');
