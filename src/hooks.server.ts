import { building } from '$app/environment';
import { createAuth } from '$lib/server/auth/auth';
import { getTextDirection } from '$lib/paraglide/runtime.js';
import { paraglideMiddleware } from '$lib/paraglide/server.js';
import { sequence } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle } from '@sveltejs/kit';

const localeHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html.replace('%lang%', locale).replace('%dir%', getTextDirection(locale))
		});
	});

const authHandle: Handle = async ({ event, resolve }) => {
	event.locals.auth = null;
	event.locals.session = null;
	event.locals.user = null;
	if (!event.platform) return resolve(event);
	const auth = createAuth(event.platform);
	event.locals.auth = auth;
	const current = await auth.api.getSession({ headers: event.request.headers });
	event.locals.session = current?.session ?? null;
	event.locals.user = current?.user ?? null;
	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle = sequence(localeHandle, authHandle);
