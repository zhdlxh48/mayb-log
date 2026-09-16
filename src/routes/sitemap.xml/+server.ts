import { getSitemapPosts } from '$lib/server/db/queries/posts/read';
import { database } from '$lib/server/db';
import { serverConfig } from '$lib/server/env';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const site = serverConfig().siteUrl;
	const staticPaths = ['/', '/posts', '/series', '/categories', '/archive'];
	const posts = await getSitemapPosts(database());
	const entries = [
		...staticPaths.map((path) => `  <url><loc>${site}${path}</loc></url>`),
		...posts.map(
			(post) =>
				`  <url><loc>${site}/posts/${post.id}</loc><lastmod>${post.updatedAt.toISOString()}</lastmod></url>`
		)
	];
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
	return new Response(xml, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=300'
		}
	});
};
