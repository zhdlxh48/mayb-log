import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, platform }) => ({
	user: locals.user,
	turnstileSiteKey: platform?.env.TURNSTILE_SITE_KEY ?? '',
	siteUrl: platform?.env.SITE_URL ?? ''
});
