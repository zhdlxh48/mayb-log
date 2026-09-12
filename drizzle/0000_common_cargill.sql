CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`username` text,
	`approved` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `post_categories` (
	`post_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	PRIMARY KEY(`post_id`, `category_id`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_categories_category_idx` ON `post_categories` (`category_id`,`post_id`);--> statement-breakpoint
CREATE TABLE `post_tags` (
	`post_id` integer NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`post_id`, `tag`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_tags_tag_idx` ON `post_tags` (`tag`,`post_id`);--> statement-breakpoint
CREATE TABLE `posts` (
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
	CONSTRAINT "posts_series_position_check" CHECK(("posts"."series_id" IS NULL AND "posts"."series_position" IS NULL) OR ("posts"."series_id" IS NOT NULL AND "posts"."series_position" IS NOT NULL AND "posts"."series_position" > 0 AND "posts"."series_position" <= 9007199254740991))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_asset_id_unique` ON `posts` (`asset_id`);--> statement-breakpoint
CREATE INDEX `posts_published_idx` ON `posts` (`published_at`,`id`) WHERE "posts"."published_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `posts_author_idx` ON `posts` (`author_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `posts_series_position_idx` ON `posts` (`series_id`,`series_position`);--> statement-breakpoint
CREATE TABLE `series` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `series_title_unique` ON `series` (`title`);
--> statement-breakpoint
CREATE VIRTUAL TABLE `posts_fts` USING fts5(
	`title`,
	`subtitle`,
	`description`,
	`body_markdown`,
	content = 'posts',
	content_rowid = 'id',
	tokenize = 'trigram'
);
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
