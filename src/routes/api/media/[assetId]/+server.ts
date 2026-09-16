import { error, json } from '@sveltejs/kit';
import { DeleteObjectsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { z } from 'zod';
import { IMAGE_EDITOR_PAGE_SIZE } from '$lib/limits';
import { requireApiUser } from '$lib/server/auth/guards';
import { listPostImages, validWebp } from '$lib/server/media/images';
import { mediaKey, mediaUrl, UUID } from '$lib/server/media/path';
import { mediaStore } from '$lib/server/media/client';
import type { RequestHandler } from './$types';
import * as m from '$lib/paraglide/messages.js';

const deleteSchema = z
	.object({ imageIds: z.array(z.string().regex(UUID)).min(1).max(IMAGE_EDITOR_PAGE_SIZE) })
	.strict();

export const GET: RequestHandler = async ({ params }) => {
	requireApiUser();
	if (!UUID.test(params.assetId)) error(400, m.invalid_asset_id());
	const { client, bucket } = mediaStore();
	return json({ images: await listPostImages(client, bucket, params.assetId) });
};

export const POST: RequestHandler = async ({ params, request }) => {
	requireApiUser();
	if (!UUID.test(params.assetId)) error(400, m.invalid_asset_id());
	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File) || !(await validWebp(file))) error(400, m.webp_only());
	const imageId = crypto.randomUUID();
	const { client, bucket } = mediaStore();
	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: mediaKey(params.assetId, imageId),
			Body: Buffer.from(await file.arrayBuffer()),
			ContentType: 'image/webp',
			CacheControl: 'public, max-age=31536000, immutable'
		})
	);
	return json({ id: imageId, url: mediaUrl(params.assetId, imageId) }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	requireApiUser();
	if (!UUID.test(params.assetId)) error(400, m.invalid_asset_id());
	const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) error(400, m.invalid_image_selection());
	const imageIds = [...new Set(parsed.data.imageIds)];
	const { client, bucket } = mediaStore();
	const result = await client.send(
		new DeleteObjectsCommand({
			Bucket: bucket,
			Delete: {
				Objects: imageIds.map((imageId) => ({ Key: mediaKey(params.assetId, imageId) })),
				Quiet: true
			}
		})
	);
	if (result.Errors?.length)
		throw new Error(`S3 failed to delete ${result.Errors.length} object(s)`);
	return new Response(null, { status: 204 });
};
