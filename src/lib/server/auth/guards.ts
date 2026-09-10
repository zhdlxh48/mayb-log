import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export function requireUser(event: RequestEvent) {
	const user = event.locals.user;
	if (!user) redirect(303, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	if (!user.approved || user.banned) error(403, '이 계정은 사용할 수 없습니다.');
	return user;
}
