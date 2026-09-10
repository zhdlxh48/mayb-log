import { requireUser } from '$lib/server/auth/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => ({ user: requireUser(event) });
