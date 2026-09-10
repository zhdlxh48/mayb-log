import { error } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth/guards';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DELETE: RequestHandler = async (event) => {
	requireUser(event);
	if (!event.platform) error(500, 'Cloudflare bindings를 사용할 수 없습니다.');
	if (!UUID.test(event.params.id)) error(404, '이미지를 찾을 수 없습니다.');
	await event.platform.env.MEDIA.delete(`media/${event.params.id}.webp`);
	return new Response(null, { status: 204 });
};
