import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ platform }) => {
	const site = platform?.env.SITE_URL ?? '';
	return new Response(`User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`, {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
};
