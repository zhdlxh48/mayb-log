import { Feed } from 'feed';
import { getFeedPosts } from '$lib/server/db/queries/posts';
import { requestDb } from '$lib/server/db/request';
import { renderMarkdown } from '$lib/server/markdown/render';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const site = platform?.env.SITE_URL ?? '';
	const feed = new Feed({
		title: 'mayb-log',
		description: '개발과 일상의 기록',
		id: site,
		link: site,
		language: 'ko',
		copyright: `© ${new Date().getFullYear()} mayb-log`,
		feedLinks: { rss2: `${site}/rss.xml` }
	});
	for (const post of await getFeedPosts(requestDb(platform))) {
		feed.addItem({
			title: post.title,
			id: `${site}/posts/${post.id}`,
			link: `${site}/posts/${post.id}`,
			description: post.description,
			content: await renderMarkdown(post.bodyMarkdown),
			author: [{ name: post.authorName }],
			date: post.publishedAt!
		});
	}
	return new Response(feed.rss2(), {
		headers: { 'content-type': 'application/rss+xml; charset=utf-8' }
	});
};
