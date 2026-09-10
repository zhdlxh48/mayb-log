import { error } from '@sveltejs/kit';
import { getPublishedPost, getSeriesNeighbors } from '$lib/server/db/queries/posts';
import { requestDb } from '$lib/server/db/request';
import { renderMarkdown } from '$lib/server/markdown/render';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404, '글을 찾을 수 없습니다.');
	const db = requestDb(platform);
	const post = await getPublishedPost(db, id);
	if (!post) error(404, '글을 찾을 수 없습니다.');
	return {
		post,
		html: await renderMarkdown(post.bodyMarkdown),
		neighbors: await getSeriesNeighbors(db, post),
		siteUrl: platform?.env.SITE_URL ?? ''
	};
};
