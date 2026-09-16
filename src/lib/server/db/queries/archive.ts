import { sql } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { publicPostCondition } from '$lib/server/db/queries/posts/read';
import { posts } from '$lib/server/db/schema/content';

export async function getArchive(db: Database, now = new Date()) {
	return db
		.select({
			year: sql<string>`to_char(${posts.publishedAt} AT TIME ZONE 'Asia/Seoul', 'YYYY')`,
			month: sql<string>`to_char(${posts.publishedAt} AT TIME ZONE 'Asia/Seoul', 'MM')`,
			count: sql<number>`count(*)::int`
		})
		.from(posts)
		.where(publicPostCondition(now))
		.groupBy(sql`1, 2`)
		.orderBy(sql`1 DESC, 2 DESC`);
}
