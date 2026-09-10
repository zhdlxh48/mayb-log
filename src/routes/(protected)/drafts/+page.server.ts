import { getDrafts } from '$lib/server/db/queries/posts';
import { requestDb } from '$lib/server/db/request';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => ({
	items: await getDrafts(requestDb(platform))
});
