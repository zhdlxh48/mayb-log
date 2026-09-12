import { getSeriesList } from '$lib/server/db/queries/taxonomy/read';
import { requestDb } from '$lib/server/db/request';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => ({
	items: await getSeriesList(requestDb(platform)),
	siteUrl: platform?.env.SITE_URL ?? ''
});
