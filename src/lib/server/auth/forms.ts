import * as m from '$lib/paraglide/messages.js';

const SENSITIVE_AUTH_FIELDS = [
	'password',
	'passwordConfirmation',
	'currentPassword',
	'newPassword',
	'captcha'
] as const;

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

export function redactSensitiveAuthForm<T extends { data: object }>(form: T) {
	for (const field of SENSITIVE_AUTH_FIELDS) {
		if (field in form.data) Reflect.set(form.data, field, '');
	}
	return form;
}
