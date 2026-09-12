import { error, redirect } from '@sveltejs/kit';
import { pagination, requestedPage } from '$lib/pagination';
import { searchFilters, searchParams } from '$lib/search';
import { countSearchPosts, searchPosts } from '$lib/server/db/queries/search';
import { getSearchOptions } from '$lib/server/db/queries/taxonomy/read';
import { requestDb } from '$lib/server/db/request';
import type { PageServerLoad } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({ platform, url }) => {
	const db = requestDb(platform);
	const filters = searchFilters(url);
	if (!filters) error(400, m.validation_search_filters());
	const page = requestedPage(url.searchParams.get('page'));
	const now = new Date();
	const [count, options] = await Promise.all([
		countSearchPosts(db, filters, now),
		getSearchOptions(db)
	]);
	const pager = pagination(page, count.total);
	if (page !== pager.current) {
		const query = searchParams(filters, pager.current);
		redirect(303, query.size ? `/search?${query}` : '/search');
	}
	const items = count.total ? await searchPosts(db, filters, page, count.authorId, now) : [];
	return {
		total: count.total,
		items,
		options,
		filters,
		pager,
		query: searchParams(filters).toString(),
		siteUrl: platform?.env.SITE_URL ?? ''
	};
};
