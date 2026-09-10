import { building } from '$app/environment';
import { createAuth } from '$lib/server/auth/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	if (!event.platform) return resolve(event);

	const auth = createAuth(event.platform);
	event.locals.auth = auth;
	const current = await auth.api.getSession({ headers: event.request.headers });
	event.locals.session = current?.session ?? null;
	event.locals.user = current?.user ?? null;

	return svelteKitHandler({ event, resolve, auth, building });
};
