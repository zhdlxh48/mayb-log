import { getCategoryList } from '$lib/server/db/queries/taxonomy/read';
import { database } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	items: await getCategoryList(database())
});
