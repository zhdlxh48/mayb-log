import { redirect } from '@sveltejs/kit';
import { pagination, requestedPage } from '$lib/pagination';
import { searchFilters, searchParams, searchPosts } from '$lib/server/db/queries/search';
import { getPostOptions } from '$lib/server/db/queries/taxonomy';
import { requestDb } from '$lib/server/db/request';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = requestDb(platform);
	const filters = searchFilters(url);
	const page = requestedPage(url.searchParams.get('page'));
	const [result, options] = await Promise.all([searchPosts(db, filters, page), getPostOptions(db)]);
	const pager = pagination(page, result.total);
	if (page !== pager.current) {
		const query = searchParams(filters, pager.current);
		redirect(303, query.size ? `/search?${query}` : '/search');
	}
	return {
		...result,
		options,
		filters,
		pager,
		query: searchParams(filters).toString(),
		siteUrl: platform?.env.SITE_URL ?? ''
	};
};
