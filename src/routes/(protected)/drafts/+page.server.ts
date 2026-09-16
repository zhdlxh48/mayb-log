import { getDrafts } from '$lib/server/db/queries/posts/read';
import { database } from '$lib/server/db';
import { requireUser } from '$lib/server/auth/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	requireUser();
	return { items: await getDrafts(database()) };
};
