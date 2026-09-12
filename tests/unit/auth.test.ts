import { describe, expect, it } from 'vitest';
import { redactSensitiveAuthForm } from '$lib/server/auth/forms';
import { loginSchema, passwordSchema, signupSchema } from '$lib/validation/auth';

describe('auth form responses', () => {
	it('redacts existing sensitive fields and preserves other input', () => {
		const form = {
			data: {
				username: 'alice',
				email: 'alice@example.com',
				password: 'SECRET-A',
				passwordConfirmation: 'SECRET-B',
				currentPassword: 'SECRET-C',
				newPassword: 'SECRET-D',
				captcha: 'SECRET-E',
				next: '/posts/new'
			}
		};

		expect(redactSensitiveAuthForm(form).data).toEqual({
			username: 'alice',
			email: 'alice@example.com',
			password: '',
			passwordConfirmation: '',
			currentPassword: '',
			newPassword: '',
			captcha: '',
			next: '/posts/new'
		});
	});

	it('does not add fields that are absent', () => {
		const form = { data: { username: 'alice', password: 'SECRET' } };
		expect(redactSensitiveAuthForm(form).data).toEqual({ username: 'alice', password: '' });
	});
});

describe('auth password input limits', () => {
	it('rejects password-related input longer than 128 characters', () => {
		const tooLong = 'a'.repeat(129);
		expect(
			signupSchema.safeParse({
				username: 'alice',
				name: 'Alice',
				email: 'alice@example.com',
				password: tooLong,
				passwordConfirmation: tooLong,
				captcha: 'token'
			}).success
		).toBe(false);
		expect(
			loginSchema.safeParse({ username: 'alice', password: tooLong, captcha: 'token' }).success
		).toBe(false);
		expect(
			passwordSchema.safeParse({
				currentPassword: tooLong,
				newPassword: tooLong,
				passwordConfirmation: tooLong
			}).success
		).toBe(false);
	});
});
