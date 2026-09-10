export function authHeaders(request: Request, captchaToken: string) {
	const headers = new Headers(request.headers);
	headers.set('x-captcha-response', captchaToken);
	return headers;
}

export function authMessage(error: unknown) {
	if (error && typeof error === 'object' && 'body' in error) {
		const body = error.body;
		if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
			return body.message;
		}
	}
	return '요청을 처리하지 못했습니다.';
}
