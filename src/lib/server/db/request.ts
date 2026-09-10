import { error } from '@sveltejs/kit';
import { database } from '$lib/server/db';
import * as m from '$lib/paraglide/messages.js';

export function requestDb(platform: App.Platform | undefined) {
	if (!platform) error(500, m.cloudflare_unavailable());
	return database(platform.env.DB);
}
