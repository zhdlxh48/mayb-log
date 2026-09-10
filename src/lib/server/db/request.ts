import { error } from '@sveltejs/kit';
import { database } from '$lib/server/db';

export function requestDb(platform: App.Platform | undefined) {
	if (!platform) error(500, 'Cloudflare bindings를 사용할 수 없습니다.');
	return database(platform.env.DB);
}
