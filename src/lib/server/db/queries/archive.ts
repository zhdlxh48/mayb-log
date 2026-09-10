import { and, eq, isNotNull, lte, sql } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { posts } from '$lib/server/db/schema/content';

export async function getArchive(db: Database, now = new Date()) {
	return db
		.select({
			year: sql<string>`strftime('%Y', ${posts.publishedAt} / 1000, 'unixepoch', '+9 hours')`,
			month: sql<string>`strftime('%m', ${posts.publishedAt} / 1000, 'unixepoch', '+9 hours')`,
			count: sql<number>`count(*)`
		})
		.from(posts)
		.where(and(eq(posts.draft, false), isNotNull(posts.publishedAt), lte(posts.publishedAt, now)))
		.groupBy(sql`1, 2`)
		.orderBy(sql`1 DESC, 2 DESC`);
}
