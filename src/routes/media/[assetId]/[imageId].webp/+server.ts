import { error } from '@sveltejs/kit';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { mediaStore } from '$lib/server/media/client';
import { mediaKey, UUID } from '$lib/server/media/path';
import type { RequestHandler } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const GET: RequestHandler = async ({ params }) => {
	if (!UUID.test(params.assetId) || !UUID.test(params.imageId)) error(404, m.image_not_found());
	const { client, bucket } = mediaStore();
	let object;
	try {
		object = await client.send(
			new GetObjectCommand({ Bucket: bucket, Key: mediaKey(params.assetId, params.imageId) })
		);
	} catch (cause) {
		const metadata =
			cause && typeof cause === 'object' && '$metadata' in cause
				? (cause.$metadata as { httpStatusCode?: number })
				: undefined;
		if (
			cause &&
			typeof cause === 'object' &&
			(('name' in cause && cause.name === 'NoSuchKey') || metadata?.httpStatusCode === 404)
		)
			error(404, m.image_not_found());
		throw cause;
	}
	if (!object.Body) error(404, m.image_not_found());
	return new Response(object.Body.transformToWebStream(), {
		headers: {
			'content-type': object.ContentType ?? 'image/webp',
			'cache-control': object.CacheControl ?? 'public, max-age=31536000, immutable',
			...(object.ETag ? { etag: object.ETag } : {})
		}
	});
};
