import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ platform }) => ({ siteUrl: platform?.env.SITE_URL ?? '' });
