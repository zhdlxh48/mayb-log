import { expect, request as createRequest, test } from '@playwright/test';
import { actionStatus, approveUser, cleanupUser, login, password, signup } from './support';

const username = 'auth_smoke_user';

test.beforeEach(() => cleanupUser(username));
test.afterEach(() => cleanupUser(username));

test('ignores a Turnstile script that finishes after the component unmounts', async ({ page }) => {
	let releaseScript = () => {};
	let markScriptRequested = () => {};
	const scriptRequested = new Promise<void>((resolve) => (markScriptRequested = resolve));
	const scriptReleased = new Promise<void>((resolve) => (releaseScript = resolve));

	await page.route('**/turnstile/v0/api.js?render=explicit', async (route) => {
		markScriptRequested();
		await scriptReleased;
		await route.fulfill({
			contentType: 'application/javascript',
			body: `window.__lateTurnstileLoaded=true;window.turnstile={render(){window.__lateTurnstileRenderCount=(window.__lateTurnstileRenderCount||0)+1;return 'late-widget'},remove(){}}`
		});
	});

	await page.goto('/login', { waitUntil: 'domcontentloaded' });
	await scriptRequested;
	await page.getByRole('link', { name: 'mayb-log', exact: true }).click();
	await expect(page).toHaveURL('/');
	releaseScript();
	await expect
		.poll(() =>
			page.evaluate(
				() => (window as typeof window & { __lateTurnstileLoaded?: boolean }).__lateTurnstileLoaded
			)
		)
		.toBe(true);
	expect(
		await page.evaluate(
			() =>
				(window as typeof window & { __lateTurnstileRenderCount?: number })
					.__lateTurnstileRenderCount ?? 0
		)
	).toBe(0);
});

test('retries a Turnstile script that fails after the component unmounts', async ({ page }) => {
	let releaseFirstScript = () => {};
	let markFirstScriptRequested = () => {};
	let markFirstScriptFailed = () => {};
	const firstScriptRequested = new Promise<void>((resolve) => (markFirstScriptRequested = resolve));
	const firstScriptReleased = new Promise<void>((resolve) => (releaseFirstScript = resolve));
	const firstScriptFailed = new Promise<void>((resolve) => (markFirstScriptFailed = resolve));
	let scriptRequests = 0;

	await page.route('**/turnstile/v0/api.js?render=explicit', async (route) => {
		scriptRequests += 1;
		if (scriptRequests === 1) {
			markFirstScriptRequested();
			await firstScriptReleased;
			await route.abort();
			markFirstScriptFailed();
			return;
		}
		await route.fulfill({
			contentType: 'application/javascript',
			body: `window.turnstile={render(container,options){const input=document.createElement('input');input.name=options['response-field-name'];input.value='test-token';container.appendChild(input);return 'retry-widget'},remove(){}}`
		});
	});

	await page.goto('/login', { waitUntil: 'domcontentloaded' });
	await firstScriptRequested;
	await page.getByRole('link', { name: 'mayb-log', exact: true }).click();
	await expect(page).toHaveURL('/');
	releaseFirstScript();
	await firstScriptFailed;
	await expect(page.locator('script[data-turnstile-failed]')).toHaveCount(1);

	const loginLink = page.locator('a[href="/login"]').first();
	await loginLink.evaluate((link) => link.removeAttribute('data-sveltekit-reload'));
	await loginLink.click();
	await expect(page).toHaveURL('/login');
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	expect(scriptRequests).toBe(2);
});

test('protects mutations and keeps the username approval auth flow working', async ({
	page,
	request,
	context
}) => {
	const anonymous = await createRequest.newContext({ baseURL: 'http://localhost:5173' });
	const assetId = crypto.randomUUID();
	const imageId = crypto.randomUUID();
	const apiHeaders = { origin: 'http://localhost:5173' };
	for (const response of [
		await anonymous.post('/api/markdown-preview', {
			headers: apiHeaders,
			data: { bodyMarkdown: '# Test' }
		}),
		await anonymous.get(`/api/media/${assetId}`, { headers: apiHeaders }),
		await anonymous.post(`/api/media/${assetId}`, { headers: apiHeaders, multipart: {} }),
		await anonymous.delete(`/api/media/${assetId}`, {
			headers: apiHeaders,
			data: { imageIds: [imageId] }
		}),
		await anonymous.delete(`/api/media/${assetId}/${imageId}`, { headers: apiHeaders })
	])
		expect(response.status()).toBe(401);
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
	let turnstileRequests = 0;
	await page.route('**/turnstile/v0/api.js?render=explicit', async (route) => {
		turnstileRequests += 1;
		if (turnstileRequests === 1) return route.abort();
		await route.fulfill({
			contentType: 'application/javascript',
			body: `window.turnstile={render(container,options){const input=document.createElement('input');input.name=options['response-field-name'];input.value='test-token';container.appendChild(input);return 'test-widget'},remove(){}}`
		});
	});
	await page.goto('/login');
	await expect(page.locator('.field-error')).toHaveCount(0);
	await expect(page.locator('.captcha-field [role="alert"]')).toBeVisible();
	await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	expect(turnstileRequests).toBe(2);
	await page.unroute('**/turnstile/v0/api.js?render=explicit');

	await page.goto('/login');
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await page.getByLabel('User ID').fill('missing_captcha_user');
	await page.getByLabel('Password', { exact: true }).fill(password);
	await page.locator('input[name="captcha"]').evaluate((element) => element.remove());
	const missingLoginCaptcha = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().endsWith('/login')
	);
	await page.getByRole('button', { name: 'Login' }).click();
	expect(await actionStatus(await missingLoginCaptcha)).toBe(400);
	await expect(page.locator('.captcha-field .field-error')).toHaveText('Complete the robot check.');

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
	await page.getByLabel('User ID').fill('toggle_test');
	await page.getByLabel('Nickname').fill('Toggle Test');
	await page.getByLabel('Email').fill('toggle@example.com');
	await page.getByLabel('Password', { exact: true }).fill(password);
	await page.getByLabel('Password confirmation').fill(password);
	await page.getByLabel('Show password').check();
	await expect(page.getByLabel('User ID')).toHaveValue('toggle_test');
	await expect(page.getByLabel('Nickname')).toHaveValue('Toggle Test');
	await expect(page.getByLabel('Email')).toHaveValue('toggle@example.com');
	await expect(page.getByLabel('Password', { exact: true })).toHaveValue(password);
	await expect(page.getByLabel('Password confirmation')).toHaveValue(password);
	await page.getByLabel('User ID').fill('missing_captcha_signup');
	await page.getByLabel('Nickname').fill('Captcha Signup');
	await page.getByLabel('Email').fill('missing-captcha@example.com');
	await page.getByLabel('Password', { exact: true }).fill(password);
	await page.getByLabel('Password confirmation').fill(password);
	await page.locator('input[name="captcha"]').evaluate((element) => element.remove());
	const missingSignupCaptcha = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().endsWith('/signup')
	);
	await page.getByRole('button', { name: 'Sign up' }).click();
	expect(await actionStatus(await missingSignupCaptcha)).toBe(400);
	await expect(page.locator('.captcha-field .field-error')).toHaveText('Complete the robot check.');

	const loginPasswordMarker = 'Sensitive-Login-Marker-123!';
	const loginCaptchaMarker = 'Sensitive-Login-Captcha-Marker';
	const failedLogin = await request.post('/login', {
		headers: { origin: 'http://localhost:5173' },
		form: {
			username: 'missing_auth_user',
			password: loginPasswordMarker,
			captcha: loginCaptchaMarker,
			next: '/posts/new'
		}
	});
	expect(await actionStatus(failedLogin)).toBe(400);
	const failedLoginBody = await failedLogin.text();
	expect(failedLoginBody).not.toContain(loginPasswordMarker);
	expect(failedLoginBody).not.toContain(loginCaptchaMarker);

	const signupPasswordMarker = 'Sensitive-Signup-Marker-123!';
	const signupConfirmationMarker = 'Sensitive-Signup-Confirmation-123!';
	const signupCaptchaMarker = 'Sensitive-Signup-Captcha-Marker';
	const invalidSignup = await request.post('/signup', {
		headers: { origin: 'http://localhost:5173' },
		form: {
			username: 'x',
			name: 'Invalid Signup',
			email: 'invalid-signup@example.com',
			password: signupPasswordMarker,
			passwordConfirmation: signupConfirmationMarker,
			captcha: signupCaptchaMarker
		}
	});
	expect(await actionStatus(invalidSignup)).toBe(400);
	const invalidSignupBody = await invalidSignup.text();
	expect(invalidSignupBody).not.toContain(signupPasswordMarker);
	expect(invalidSignupBody).not.toContain(signupConfirmationMarker);
	expect(invalidSignupBody).not.toContain(signupCaptchaMarker);

	const created = await signup(request, username, 'Auth Smoke User');
	expect(created.ok()).toBe(true);
	const signupSuccessBody = await created.text();
	expect(signupSuccessBody).not.toContain(password);
	expect(signupSuccessBody).not.toContain('test-token');
	expect(signupSuccessBody).not.toContain(username);
	expect(signupSuccessBody).not.toContain('Auth Smoke User');
	expect(signupSuccessBody).not.toContain(`${username}@example.com`);
	const unapproved = await request.post('/api/auth/sign-in/username', {
		headers: { 'x-captcha-response': 'test-token', origin: 'http://localhost:5173' },
		data: { username, password }
	});
	expect(unapproved.status()).toBe(403);
	approveUser(username);

	await login(page, username);
	await expect(page).toHaveURL('/posts/new');
	await expect(page.locator('input[name="assetId"]')).toHaveValue(/^[0-9a-f-]{36}$/);

	const currentPasswordMarker = 'Sensitive-Current-Password-123!';
	const newPasswordMarker = 'Sensitive-New-Password-123!';
	const passwordFailure = await context.request.post('/profile?/password', {
		headers: { origin: 'http://localhost:5173' },
		form: {
			currentPassword: currentPasswordMarker,
			newPassword: newPasswordMarker,
			passwordConfirmation: newPasswordMarker
		}
	});
	expect(await actionStatus(passwordFailure)).toBe(400);
	const passwordFailureBody = await passwordFailure.text();
	expect(passwordFailureBody).not.toContain(currentPasswordMarker);
	expect(passwordFailureBody).not.toContain(newPasswordMarker);
});
