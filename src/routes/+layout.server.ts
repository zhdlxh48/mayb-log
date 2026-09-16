import type { LayoutServerLoad } from './$types';
import { serverConfig } from '$lib/server/env';

export const load: LayoutServerLoad = ({ locals }) => {
	const config = serverConfig();
	return {
		user: locals.user,
		turnstileSiteKey: config.turnstileSiteKey,
		siteUrl: config.siteUrl
	};
};
