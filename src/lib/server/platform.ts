import { error } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages.js';

export function requirePlatform(platform: App.Platform | undefined): App.Platform {
	if (!platform) error(500, m.cloudflare_unavailable());
	return platform;
}
