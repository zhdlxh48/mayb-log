import { z } from 'zod';

export const signupSchema = z
	.object({
		username: z
			.string()
			.trim()
			.min(3, '아이디는 세 글자 이상이어야 합니다.')
			.max(30, '아이디는 30글자 이하여야 합니다.')
			.regex(/^[a-zA-Z0-9_.]+$/, '영문, 숫자, 밑줄, 마침표만 사용할 수 있습니다.'),
		name: z.string().trim().min(2, '닉네임은 두 글자 이상이어야 합니다.').max(50),
		email: z.string().trim().toLowerCase().email('올바른 이메일 주소를 입력하세요.'),
		password: z.string().min(8, '비밀번호는 여덟 글자 이상이어야 합니다.').max(128),
		passwordConfirmation: z.string(),
		captcha: z.string().min(1, '로봇 확인을 완료하세요.')
	})
	.refine((value) => value.password === value.passwordConfirmation, {
		message: '비밀번호가 일치하지 않습니다.',
		path: ['passwordConfirmation']
	});

export const loginSchema = z.object({
	username: z.string().trim().min(1, '아이디를 입력하세요.').max(30),
	password: z.string().min(1, '비밀번호를 입력하세요.'),
	captcha: z.string().min(1, '로봇 확인을 완료하세요.'),
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
		message: '새 비밀번호가 일치하지 않습니다.',
		path: ['passwordConfirmation']
	});
