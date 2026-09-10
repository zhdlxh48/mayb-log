import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const GET: RequestHandler = async ({ params, platform }) => {
	if (!platform || !UUID.test(params.id)) error(404, '이미지를 찾을 수 없습니다.');
	const object = await platform.env.MEDIA.get(`media/${params.id}.webp`);
	if (!object) error(404, '이미지를 찾을 수 없습니다.');
	return new Response(object.body, {
		headers: {
			'content-type': object.httpMetadata?.contentType ?? 'image/webp',
			'cache-control': object.httpMetadata?.cacheControl ?? 'public, max-age=31536000, immutable',
			etag: object.httpEtag
		}
	});
};
