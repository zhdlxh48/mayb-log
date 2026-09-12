import * as m from '$lib/paraglide/messages.js';

export function authHeaders(request: Request, captchaToken: string) {
	const headers = new Headers(request.headers);
	headers.set('x-captcha-response', captchaToken);
	return headers;
}

export function authMessage(error: unknown) {
	if (error && typeof error === 'object' && 'body' in error) {
		const body = error.body;
		if (body && typeof body === 'object') return m.request_failed();
	}
	return null;
}
