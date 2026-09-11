PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_post_tags` (
	`post_id` integer NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`post_id`, `tag`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_post_tags` (`post_id`, `tag`)
SELECT `post_tags`.`post_id`, `tags`.`name`
FROM `post_tags`
INNER JOIN `tags` ON `tags`.`id` = `post_tags`.`tag_id`;--> statement-breakpoint
DROP TABLE `post_tags`;--> statement-breakpoint
DROP TABLE `tags`;--> statement-breakpoint
ALTER TABLE `__new_post_tags` RENAME TO `post_tags`;--> statement-breakpoint
CREATE INDEX `post_tags_tag_idx` ON `post_tags` (`tag`,`post_id`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
