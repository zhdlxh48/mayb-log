import { expect, request as createRequest, test } from '@playwright/test';
import { approveUser, cleanupUser, login, password, signup } from './support';

const username = 'auth_smoke_user';

test.beforeEach(() => cleanupUser(username));
test.afterEach(() => cleanupUser(username));

test('protects mutations and keeps the username approval auth flow working', async ({
	page,
	request,
	context
}) => {
	const anonymous = await createRequest.newContext({ baseURL: 'http://localhost:5173' });
	const mutation = await anonymous.post('/posts/new?/saveDraft', {
		maxRedirects: 0,
		headers: { origin: 'http://localhost:5173' },
		form: {}
	});
	const deniedMutation = (await mutation.json()) as {
		type: string;
		status: number;
		location: string;
	};
	expect(deniedMutation).toMatchObject({ type: 'redirect', status: 303 });
	expect(deniedMutation.location).toContain('/login?next=');
	expect((await anonymous.get('/posts/new', { maxRedirects: 0 })).status()).toBe(303);
	await anonymous.dispose();

	await context.addCookies([
		{ name: 'PARAGLIDE_LOCALE', value: 'en', domain: 'localhost', path: '/' }
	]);
	await page.goto('/login');
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await page.getByRole('link', { name: 'Sign up' }).click();
	await expect(page).toHaveURL('/signup');
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await page.goBack();
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await page.goForward();
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	const otherTab = await context.newPage();
	await otherTab.goto('about:blank');
	await page.bringToFront();
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await otherTab.close();

	const created = await signup(request, username, 'Auth Smoke User');
	expect(created.ok(), `${created.status()} ${await created.text()}`).toBe(true);
	const unapproved = await request.post('/api/auth/sign-in/username', {
		headers: { 'x-captcha-response': 'test-token', origin: 'http://localhost:5173' },
		data: { username, password }
	});
	expect(unapproved.status()).toBe(403);
	approveUser(username);

	await login(page, username);
	await expect(page).toHaveURL('/posts/new');
	await expect(page.locator('input[name="assetId"]')).toHaveValue(/^[0-9a-f-]{36}$/);
});
