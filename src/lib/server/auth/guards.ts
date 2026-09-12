import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import * as m from '$lib/paraglide/messages.js';

export function requireAuth() {
	const auth = getRequestEvent().locals.auth;
	if (!auth) error(500, m.cloudflare_unavailable());
	return auth;
}

export function requireUser() {
	const event = getRequestEvent();
	const user = event.locals.user;
	if (!user)
		redirect(303, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	if (!user.approved) error(403, m.account_unapproved());
	return user;
}
