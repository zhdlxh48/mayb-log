import { getCategoryList } from '$lib/server/db/queries/taxonomy';
import { requestDb } from '$lib/server/db/request';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => ({
	items: await getCategoryList(requestDb(platform)),
	siteUrl: platform?.env.SITE_URL ?? ''
});
