import { z } from 'zod';

const optionalInteger = z.preprocess(
	(value) => (value === '' || value === null || value === undefined ? null : Number(value)),
	z.number().int().positive().nullable()
);

export const postSchema = z
	.object({
		title: z.string().trim().min(1, '제목을 입력하세요.').max(200),
		subtitle: z.string().trim().max(300).default(''),
		description: z.string().trim().min(1, '설명을 입력하세요.').max(500),
		bodyMarkdown: z.string().min(1, '본문을 입력하세요.'),
		seriesId: optionalInteger,
		seriesPosition: optionalInteger,
		categories: z.array(z.coerce.number().int().positive()).default([]),
		tags: z.string().max(1000).default(''),
		publishedAt: z
			.string()
			.regex(/^$|^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, '발행 시각을 확인하세요.')
			.default(''),
		noindex: z.boolean().default(false)
	})
	.superRefine((value, context) => {
		if (value.seriesId && !value.seriesPosition) {
			context.addIssue({
				code: 'custom',
				path: ['seriesPosition'],
				message: '시리즈 순서를 입력하세요.'
			});
		}
	});

export const seriesSchema = z.object({
	title: z.string().trim().min(1, '제목을 입력하세요.').max(100),
	description: z.string().trim().max(500).default('')
});

export const categorySchema = z.object({
	name: z.string().trim().min(1, '이름을 입력하세요.').max(100),
	description: z.string().trim().max(500).default('')
});

export function tagNames(value: string) {
	return [
		...new Set(
			value
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean)
		)
	];
}
