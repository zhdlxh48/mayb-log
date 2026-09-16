import type { RequestHandler } from './$types';
import { serverConfig } from '$lib/server/env';

export const GET: RequestHandler = () => {
	const siteUrl = serverConfig().siteUrl;
	const sitemapUrl = new URL('/sitemap.xml', siteUrl).href;
	return new Response(`User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`, {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
};
