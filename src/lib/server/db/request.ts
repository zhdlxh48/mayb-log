import { database } from '$lib/server/db';
import { requirePlatform } from '$lib/server/platform';

export function requestDb(platform: App.Platform | undefined) {
	return database(requirePlatform(platform).env.DB);
}
