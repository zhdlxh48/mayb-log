import { error } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth/guards';
import { mediaKey, UUID } from '$lib/server/media/path';
import type { RequestHandler } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const DELETE: RequestHandler = async ({ params, platform }) => {
	requireUser();
	if (!platform) error(500, m.cloudflare_unavailable());
	if (!UUID.test(params.assetId) || !UUID.test(params.imageId)) error(404, m.image_not_found());
	await platform.env.MEDIA.delete(mediaKey(params.assetId, params.imageId));
	return new Response(null, { status: 204 });
};
