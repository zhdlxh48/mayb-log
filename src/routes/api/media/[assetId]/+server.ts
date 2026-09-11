import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth/guards';
import { listPostImages, validWebp } from '$lib/server/media/images';
import { mediaKey, mediaUrl, UUID } from '$lib/server/media/path';
import type { RequestHandler } from './$types';
import * as m from '$lib/paraglide/messages.js';

const MAX_DELETE_IMAGES = 100;
const deleteSchema = z
	.object({ imageIds: z.array(z.string().regex(UUID)).min(1).max(MAX_DELETE_IMAGES) })
	.strict();

export const GET: RequestHandler = async ({ params, platform }) => {
	requireUser();
	if (!platform) error(500, m.cloudflare_unavailable());
	if (!UUID.test(params.assetId)) error(400, m.invalid_asset_id());
	return json({ images: await listPostImages(platform.env.MEDIA, params.assetId) });
};

export const POST: RequestHandler = async ({ params, platform, request }) => {
	requireUser();
	if (!platform) error(500, m.cloudflare_unavailable());
	if (!UUID.test(params.assetId)) error(400, m.invalid_asset_id());
	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File) || !(await validWebp(file))) error(400, m.webp_only());
	const imageId = crypto.randomUUID();
	await platform.env.MEDIA.put(mediaKey(params.assetId, imageId), file.stream(), {
		httpMetadata: {
			contentType: 'image/webp',
			cacheControl: 'public, max-age=31536000, immutable'
		}
	});
	return json({ id: imageId, url: mediaUrl(params.assetId, imageId) }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params, platform, request }) => {
	requireUser();
	if (!platform) error(500, m.cloudflare_unavailable());
	if (!UUID.test(params.assetId)) error(400, m.invalid_asset_id());
	const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) error(400, m.invalid_image_selection());
	const imageIds = [...new Set(parsed.data.imageIds)];
	await platform.env.MEDIA.delete(imageIds.map((imageId) => mediaKey(params.assetId, imageId)));
	return new Response(null, { status: 204 });
};
