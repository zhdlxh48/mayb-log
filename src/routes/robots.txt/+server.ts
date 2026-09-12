import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ platform, url }) => {
	const siteUrl = platform?.env.SITE_URL || url.origin;
	const sitemapUrl = new URL('/sitemap.xml', siteUrl).href;
	return new Response(`User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`, {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
};
