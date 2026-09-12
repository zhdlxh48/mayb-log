import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { IMAGE_EDITOR_PAGE_SIZE } from '$lib/limits';
import { requireApiUser } from '$lib/server/auth/guards';
import { listPostImages, validWebp } from '$lib/server/media/images';
import { mediaKey, mediaUrl, UUID } from '$lib/server/media/path';
import { requirePlatform } from '$lib/server/platform';
import type { RequestHandler } from './$types';
import * as m from '$lib/paraglide/messages.js';

const deleteSchema = z
	.object({ imageIds: z.array(z.string().regex(UUID)).min(1).max(IMAGE_EDITOR_PAGE_SIZE) })
	.strict();

export const GET: RequestHandler = async ({ params, platform }) => {
	requireApiUser();
	const runtime = requirePlatform(platform);
	if (!UUID.test(params.assetId)) error(400, m.invalid_asset_id());
	return json({ images: await listPostImages(runtime.env.MEDIA, params.assetId) });
};

export const POST: RequestHandler = async ({ params, platform, request }) => {
	requireApiUser();
	const runtime = requirePlatform(platform);
	if (!UUID.test(params.assetId)) error(400, m.invalid_asset_id());
	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File) || !(await validWebp(file))) error(400, m.webp_only());
	const imageId = crypto.randomUUID();
	await runtime.env.MEDIA.put(mediaKey(params.assetId, imageId), file.stream(), {
		httpMetadata: {
			contentType: 'image/webp',
			cacheControl: 'public, max-age=31536000, immutable'
		}
	});
	return json({ id: imageId, url: mediaUrl(params.assetId, imageId) }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params, platform, request }) => {
	requireApiUser();
	const runtime = requirePlatform(platform);
	if (!UUID.test(params.assetId)) error(400, m.invalid_asset_id());
	const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) error(400, m.invalid_image_selection());
	const imageIds = [...new Set(parsed.data.imageIds)];
	await runtime.env.MEDIA.delete(imageIds.map((imageId) => mediaKey(params.assetId, imageId)));
	return new Response(null, { status: 204 });
};
