import { error } from '@sveltejs/kit';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { requireApiUser } from '$lib/server/auth/guards';
import { mediaKey, UUID } from '$lib/server/media/path';
import { mediaStore } from '$lib/server/media/client';
import type { RequestHandler } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const DELETE: RequestHandler = async ({ params }) => {
	requireApiUser();
	if (!UUID.test(params.assetId) || !UUID.test(params.imageId)) error(404, m.image_not_found());
	const { client, bucket } = mediaStore();
	await client.send(
		new DeleteObjectCommand({ Bucket: bucket, Key: mediaKey(params.assetId, params.imageId) })
	);
	return new Response(null, { status: 204 });
};
