import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

const username = 'smoke_user';
const email = 'smoke_user@example.com';
const password = 'Smoke-password-123!';
const changedPassword = 'Changed-password-123!';

function sql(command: string) {
	execFileSync(
		process.execPath,
		[
			'node_modules/wrangler/bin/wrangler.js',
			'd1',
			'execute',
			'DB',
			'--local',
			'--command',
			command
		],
		{ stdio: 'ignore' }
	);
}

test.beforeAll(async ({ request }) => {
	sql(`DELETE FROM posts WHERE author_id IN (SELECT id FROM user WHERE username = '${username}');`);
	sql(`DELETE FROM user WHERE username = '${username}';`);

	const response = await request.post('/signup', {
		headers: { origin: 'http://localhost:5173' },
		form: {
			username,
			name: 'Smoke User',
			email,
			password,
			passwordConfirmation: password,
			captcha: 'test-token'
		}
	});
	expect(response.ok(), `${response.status()} ${await response.text()}`).toBe(true);
	const denied = await request.post('/api/auth/sign-in/username', {
		headers: { 'x-captcha-response': 'test-token', origin: 'http://localhost:5173' },
		data: { username, password }
	});
	expect(denied.status()).toBe(403);
	sql(`UPDATE user SET approved = 1 WHERE username = '${username}';`);
});

test.afterAll(() => {
	sql(`DELETE FROM posts WHERE author_id IN (SELECT id FROM user WHERE username = '${username}');`);
	sql(`DELETE FROM user WHERE username = '${username}';`);
});

test('draft, image, publish, search, archive, edit and delete', async ({ page }) => {
	await page.goto('/login');
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await page.getByRole('link', { name: 'Sign up' }).click();
	await expect(page).toHaveURL('/signup');
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await page.getByRole('link', { name: '이미 계정이 있습니다.' }).click();
	await expect(page).toHaveURL('/login');
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await page.goBack();
	await expect(page).toHaveURL('/signup');
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await page.goForward();
	await expect(page).toHaveURL('/login');
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/login');
	await page.getByRole('link', { name: 'Sign up' }).click();
	await expect(page).toHaveURL('/signup');
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await page
		.locator('[data-turnstile-container]')
		.evaluate((container) => container.replaceChildren());
	await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
	await expect(page.locator('[data-turnstile-container] input[name="captcha"]')).toBeAttached();
	await page.setViewportSize({ width: 1280, height: 720 });

	const login = await page.request.post('/login', {
		headers: { origin: 'http://localhost:5173' },
		form: { username, password, captcha: 'test-token', next: '/profile' }
	});
	expect(login.ok()).toBe(true);

	await page.goto('/profile');
	await expect(page.getByText(username, { exact: true })).toBeVisible();
	await expect(page.getByText(email, { exact: true })).toBeVisible();
	await page.getByLabel('Current password').fill(password);
	await page.getByLabel('New password').fill(changedPassword);
	await page.getByLabel('Confirmation').fill(changedPassword);
	await page.getByRole('button', { name: 'Change password' }).click();
	await expect(page.getByRole('status')).toContainText('비밀번호를 변경했습니다.');
	const changedLogin = await page.evaluate(
		async ({ username, password }) => {
			await fetch('/api/auth/sign-out', { method: 'POST' });
			return fetch('/api/auth/sign-in/username', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'x-captcha-response': 'test-token' },
				body: JSON.stringify({ username, password })
			}).then((response) => response.status);
		},
		{ username, password: changedPassword }
	);
	expect(changedLogin).toBe(200);

	const mediaUrl = await page.evaluate(async () => {
		const bytes = Uint8Array.from(
			atob('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEALmk0mk0iIiIiIgBoSygABc6zbAAA'),
			(value) => value.charCodeAt(0)
		);
		const body = new FormData();
		body.set('file', new File([bytes], 'smoke.webp', { type: 'image/webp' }));
		const response = await fetch('/api/media', { method: 'POST', body });
		if (!response.ok) throw new Error(await response.text());
		return ((await response.json()) as { url: string }).url;
	});

	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/posts/new');
	const toolbar = await page.getByRole('toolbar').boundingBox();
	const writeTab = await page.getByRole('button', { name: 'Write' }).boundingBox();
	expect(toolbar).not.toBeNull();
	expect(writeTab).not.toBeNull();
	expect(writeTab!.y).toBeGreaterThanOrEqual(toolbar!.y);
	expect(writeTab!.y + writeTab!.height).toBeLessThanOrEqual(toolbar!.y + toolbar!.height + 1);
	await page.getByLabel('Title', { exact: true }).fill('SvelteKit smoke post');
	await page.getByLabel('Description').fill('초안부터 공개까지 확인하는 테스트 글입니다.');
	await page.locator('input[name="bodyMarkdown"]').evaluate((input, media) => {
		(input as HTMLInputElement).value = `# Smoke\n\n![test image](${media})`;
	}, mediaUrl);
	await page.getByRole('button', { name: 'Save draft' }).click();
	await page.setViewportSize({ width: 1280, height: 720 });
	await expect(page).toHaveURL(/\/posts\/\d+\/edit\?saved=1$/);
	await expect(page.getByRole('status')).toContainText('저장했습니다.');
	const editUrl = page.url();
	const postId = editUrl.match(/\/posts\/(\d+)\/edit/)?.[1];
	expect(postId).toBeTruthy();

	await page.goto('/drafts');
	await expect(page.getByRole('link', { name: 'SvelteKit smoke post' })).toBeVisible();
	await page.getByRole('link', { name: 'SvelteKit smoke post' }).click();
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page).toHaveURL(`/posts/${postId}`);
	await expect(page.getByRole('heading', { name: 'SvelteKit smoke post' })).toBeVisible();
	await expect(page.locator('.article-body img')).toHaveAttribute('src', mediaUrl);

	await page.goto('/search?q=SvelteKit');
	await expect(page.getByRole('link', { name: 'SvelteKit smoke post' })).toBeVisible();
	await page.goto('/archive');
	await expect(page.getByText(`${new Date().getFullYear()} (1)`)).toBeVisible();

	await page.goto(editUrl);
	await page.getByLabel('Title', { exact: true }).fill('Edited smoke post');
	await page.getByRole('button', { name: 'Save changes' }).click();
	await expect(page.getByRole('heading', { name: 'Edited smoke post' })).toBeVisible();
	await page.getByRole('link', { name: 'Edit' }).click();
	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Delete', exact: true }).click();
	await expect(page).toHaveURL('/posts');

	const removed = await page.evaluate(
		async (url) => fetch(url, { method: 'DELETE' }).then((r) => r.status),
		mediaUrl.replace('/media/', '/api/media/').replace('.webp', '')
	);
	expect(removed).toBe(204);
});
