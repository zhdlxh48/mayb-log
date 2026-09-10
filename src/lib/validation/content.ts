import { z } from 'zod';
import * as m from '$lib/paraglide/messages.js';

const optionalInteger = z.preprocess(
	(value) => (value === '' || value === null || value === undefined ? null : Number(value)),
	z.number().int().positive().nullable()
);

export const postSchema = z
	.object({
		title: z
			.string()
			.trim()
			.min(1, { error: () => m.validation_title_required() })
			.max(200),
		subtitle: z.string().trim().max(300).default(''),
		description: z
			.string()
			.trim()
			.min(1, { error: () => m.validation_description_required() })
			.max(500),
		bodyMarkdown: z.string().min(1, { error: () => m.validation_body_required() }),
		seriesId: optionalInteger,
		seriesPosition: optionalInteger,
		categories: z.array(z.coerce.number().int().positive()).default([]),
		tags: z.string().max(1000).default(''),
		publishedAt: z
			.string()
			.regex(/^$|^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, { error: () => m.validation_publish_time() })
			.default(''),
		noindex: z.boolean().default(false)
	})
	.superRefine((value, context) => {
		if (value.seriesId && !value.seriesPosition) {
			context.addIssue({
				code: 'custom',
				path: ['seriesPosition'],
				message: m.validation_series_position()
			});
		}
	});

export const seriesSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, { error: () => m.validation_title_required() })
		.max(100),
	description: z.string().trim().max(500).default('')
});

export const categorySchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, { error: () => m.validation_name_required() })
		.max(100),
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
