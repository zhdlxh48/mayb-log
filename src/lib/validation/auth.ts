import { z } from 'zod';
import * as m from '$lib/paraglide/messages.js';

export const signupSchema = z
	.object({
		username: z
			.string()
			.trim()
			.min(3, { error: () => m.validation_username_min() })
			.max(30, { error: () => m.validation_username_max() })
			.regex(/^[a-zA-Z0-9_.]+$/, { error: () => m.validation_username_chars() }),
		name: z
			.string()
			.trim()
			.min(2, { error: () => m.validation_nickname_min() })
			.max(50),
		email: z
			.string()
			.trim()
			.toLowerCase()
			.email({ error: () => m.validation_email() }),
		password: z
			.string()
			.min(8, { error: () => m.validation_password_min() })
			.max(128),
		passwordConfirmation: z.string(),
		captcha: z.string().min(1, { error: () => m.validation_captcha() })
	})
	.refine((value) => value.password === value.passwordConfirmation, {
		error: () => m.validation_password_match(),
		path: ['passwordConfirmation']
	});

export const loginSchema = z.object({
	username: z
		.string()
		.trim()
		.min(1, { error: () => m.validation_username_required() })
		.max(30),
	password: z.string().min(1, { error: () => m.validation_password_required() }),
	captcha: z.string().min(1, { error: () => m.validation_captcha() }),
	next: z.string().default('')
});

export const profileSchema = z.object({
	name: z.string().trim().min(2).max(50)
});

export const passwordSchema = z
	.object({
		currentPassword: z.string().min(1),
		newPassword: z.string().min(8).max(128),
		passwordConfirmation: z.string()
	})
	.refine((value) => value.newPassword === value.passwordConfirmation, {
		error: () => m.validation_new_password_match(),
		path: ['passwordConfirmation']
	});
