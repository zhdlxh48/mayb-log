import { redirect } from '@sveltejs/kit';
import { pagination, requestedPage } from '$lib/pagination';
import { getPublishedPosts } from '$lib/server/db/queries/posts';
import { requestDb } from '$lib/server/db/request';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, url }) => {
	const page = requestedPage(url.searchParams.get('page'));
	const result = await getPublishedPosts(requestDb(platform), page);
	const pager = pagination(page, result.total);
	if (page !== pager.current)
		redirect(303, pager.current === 1 ? '/posts' : `/posts?page=${pager.current}`);
	return { ...result, pager, siteUrl: platform?.env.SITE_URL ?? '' };
};
