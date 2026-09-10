import { error, json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth/guards';
import { validWebp } from '$lib/server/media/images';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	requireUser(event);
	if (!event.platform) error(500, 'Cloudflare bindings를 사용할 수 없습니다.');
	const form = await event.request.formData();
	const file = form.get('file');
	if (!(file instanceof File) || !(await validWebp(file)))
		error(400, '4MiB 이하 WebP 이미지만 업로드할 수 있습니다.');
	const id = crypto.randomUUID();
	await event.platform.env.MEDIA.put(`media/${id}.webp`, file.stream(), {
		httpMetadata: { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' }
	});
	return json({ url: `/media/${id}.webp` }, { status: 201 });
};
