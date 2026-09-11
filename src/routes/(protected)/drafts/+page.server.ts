import { getDrafts } from '$lib/server/db/queries/posts';
import { requestDb } from '$lib/server/db/request';
import { requireUser } from '$lib/server/auth/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	requireUser();
	return { items: await getDrafts(requestDb(platform)) };
};
