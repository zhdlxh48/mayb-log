import { getFeedPosts } from '$lib/server/db/queries/posts';
import { requestDb } from '$lib/server/db/request';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const site = platform?.env.SITE_URL ?? '';
	const staticPaths = ['/', '/posts', '/series', '/categories', '/archive'];
	const posts = (await getFeedPosts(requestDb(platform))).filter((post) => !post.noindex);
	const locations = [
		...staticPaths.map((path) => `${site}${path}`),
		...posts.map((post) => `${site}/posts/${post.id}`)
	];
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>`;
	return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
