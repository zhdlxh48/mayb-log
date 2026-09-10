import { error } from '@sveltejs/kit';
import { mediaKey, UUID } from '$lib/server/media/path';
import type { RequestHandler } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const GET: RequestHandler = async ({ params, platform }) => {
	if (!platform || !UUID.test(params.assetId) || !UUID.test(params.imageId))
		error(404, m.image_not_found());
	const object = await platform.env.MEDIA.get(mediaKey(params.assetId, params.imageId));
	if (!object) error(404, m.image_not_found());
	return new Response(object.body, {
		headers: {
			'content-type': object.httpMetadata?.contentType ?? 'image/webp',
			'cache-control': object.httpMetadata?.cacheControl ?? 'public, max-age=31536000, immutable',
			etag: object.httpEtag
		}
	});
};
