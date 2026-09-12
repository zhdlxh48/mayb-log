import { getSitemapPosts } from '$lib/server/db/queries/posts/read';
import { requestDb } from '$lib/server/db/request';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const site = platform?.env.SITE_URL ?? '';
	const staticPaths = ['/', '/posts', '/series', '/categories', '/archive'];
	const posts = await getSitemapPosts(requestDb(platform));
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
