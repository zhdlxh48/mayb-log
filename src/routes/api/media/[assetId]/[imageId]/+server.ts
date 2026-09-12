import { error } from '@sveltejs/kit';
import { requireApiUser } from '$lib/server/auth/guards';
import { mediaKey, UUID } from '$lib/server/media/path';
import { requirePlatform } from '$lib/server/platform';
import type { RequestHandler } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const DELETE: RequestHandler = async ({ params, platform }) => {
	requireApiUser();
	const runtime = requirePlatform(platform);
	if (!UUID.test(params.assetId) || !UUID.test(params.imageId)) error(404, m.image_not_found());
	await runtime.env.MEDIA.delete(mediaKey(params.assetId, params.imageId));
	return new Response(null, { status: 204 });
};
