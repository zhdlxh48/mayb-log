import { redirect } from '@sveltejs/kit';
import { pagination, requestedPage } from '$lib/pagination';
import { countPublishedPosts, getPublishedPostPage } from '$lib/server/db/queries/posts/read';
import { requestDb } from '$lib/server/db/request';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = requestDb(platform);
	const now = new Date();
	const page = requestedPage(url.searchParams.get('page'));
	const total = await countPublishedPosts(db, now);
	const pager = pagination(page, total);
	if (page !== pager.current)
		redirect(303, pager.current === 1 ? '/posts' : `/posts?page=${pager.current}`);
	const items = total ? await getPublishedPostPage(db, page, now) : [];
	return { total, items, pager };
};
