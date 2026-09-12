import { z } from 'zod';
import * as m from '$lib/paraglide/messages.js';

export const signupSchema = z
	.object({
		username: z
			.string({ error: () => m.validation_username_required() })
			.trim()
			.min(3, { error: () => m.validation_username_min() })
			.max(30, { error: () => m.validation_username_max() })
			.regex(/^[a-zA-Z0-9_.]+$/, { error: () => m.validation_username_chars() }),
		name: z
			.string({ error: () => m.validation_nickname_min() })
			.trim()
			.min(2, { error: () => m.validation_nickname_min() })
			.max(50, { error: () => m.validation_nickname_max() }),
		email: z
			.string({ error: () => m.validation_email() })
			.trim()
			.toLowerCase()
			.email({ error: () => m.validation_email() }),
		password: z
			.string({ error: () => m.validation_password_required() })
			.min(8, { error: () => m.validation_password_min() })
			.max(128, { error: () => m.validation_password_max() }),
		passwordConfirmation: z
			.string({ error: () => m.validation_password_required() })
			.max(128, { error: () => m.validation_password_max() }),
		captcha: z
			.string({ error: () => m.validation_captcha() })
			.min(1, { error: () => m.validation_captcha() })
	})
	.refine((value) => value.password === value.passwordConfirmation, {
		error: () => m.validation_password_match(),
		path: ['passwordConfirmation']
	});

export const loginSchema = z.object({
	username: z
		.string({ error: () => m.validation_username_required() })
		.trim()
		.min(1, { error: () => m.validation_username_required() })
		.max(30, { error: () => m.validation_username_max() }),
	password: z
		.string({ error: () => m.validation_password_required() })
		.min(1, { error: () => m.validation_password_required() })
		.max(128, { error: () => m.validation_password_max() }),
	captcha: z
		.string({ error: () => m.validation_captcha() })
		.min(1, { error: () => m.validation_captcha() }),
	next: z.string().default('')
});

export const profileSchema = z.object({
	name: z
		.string({ error: () => m.validation_nickname_min() })
		.trim()
		.min(2, { error: () => m.validation_nickname_min() })
		.max(50, { error: () => m.validation_nickname_max() })
});

export const passwordSchema = z
	.object({
		currentPassword: z
			.string({ error: () => m.validation_password_required() })
			.min(1, { error: () => m.validation_password_required() })
			.max(128, { error: () => m.validation_password_max() }),
		newPassword: z
			.string({ error: () => m.validation_password_required() })
			.min(8, { error: () => m.validation_password_min() })
			.max(128, { error: () => m.validation_password_max() }),
		passwordConfirmation: z
			.string({ error: () => m.validation_password_required() })
			.max(128, { error: () => m.validation_password_max() })
	})
	.refine((value) => value.newPassword === value.passwordConfirmation, {
		error: () => m.validation_new_password_match(),
		path: ['passwordConfirmation']
	});
