import { z } from 'zod';
import * as m from '$lib/paraglide/messages.js';
import { parseKoreanDateTimeLocal } from '$lib/dates';
import {
	MAX_CATEGORIES_PER_POST,
	MAX_MARKDOWN_BYTES,
	MAX_TAG_LENGTH,
	MAX_TAGS_INPUT_LENGTH,
	MAX_TAGS_PER_POST
} from '$lib/limits';

const optionalInteger = z.preprocess(
	(value) => (value === '' || value === null || value === undefined ? null : Number(value)),
	z
		.number({ error: () => m.validation_positive_integer() })
		.int({ error: () => m.validation_positive_integer() })
		.positive({ error: () => m.validation_positive_integer() })
		.nullable()
);

export const postSchema = z
	.object({
		title: z
			.string({ error: () => m.validation_title_required() })
			.trim()
			.min(1, { error: () => m.validation_title_required() })
			.max(200, { error: () => m.validation_post_title_max() }),
		subtitle: z
			.string({ error: () => m.validation_subtitle_max() })
			.trim()
			.max(300, { error: () => m.validation_subtitle_max() })
			.default(''),
		description: z
			.string({ error: () => m.validation_description_required() })
			.trim()
			.min(1, { error: () => m.validation_description_required() })
			.max(500, { error: () => m.validation_description_max() }),
		bodyMarkdown: z
			.string({ error: () => m.validation_body_required() })
			.min(1, { error: () => m.validation_body_required() })
			.refine((value) => new TextEncoder().encode(value).byteLength <= MAX_MARKDOWN_BYTES, {
				error: () => m.markdown_too_large()
			}),
		seriesId: optionalInteger,
		seriesPosition: optionalInteger,
		categories: z
			.array(
				z.coerce
					.number({ error: () => m.validation_positive_integer() })
					.int({ error: () => m.validation_positive_integer() })
					.positive({ error: () => m.validation_positive_integer() })
			)
			.max(MAX_CATEGORIES_PER_POST, { error: () => m.validation_categories_limit() })
			.default([]),
		tags: z
			.string({ error: () => m.validation_tags_input_length() })
			.max(MAX_TAGS_INPUT_LENGTH, { error: () => m.validation_tags_input_length() })
			.superRefine((value, context) => {
				const names = tagNames(value);
				if (names.length > MAX_TAGS_PER_POST)
					context.addIssue({ code: 'custom', message: m.validation_tags_limit() });
				if (names.some((name) => Array.from(name).length > MAX_TAG_LENGTH))
					context.addIssue({ code: 'custom', message: m.validation_tag_length() });
			})
			.default(''),
		publishedAt: z
			.string({ error: () => m.validation_publish_time() })
			.refine((value) => value === '' || parseKoreanDateTimeLocal(value) !== null, {
				error: () => m.validation_publish_time()
			})
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
		.string({ error: () => m.validation_title_required() })
		.trim()
		.min(1, { error: () => m.validation_title_required() })
		.max(100, { error: () => m.validation_series_title_max() }),
	description: z
		.string({ error: () => m.validation_description_max() })
		.trim()
		.max(500, { error: () => m.validation_description_max() })
		.default('')
});

export const categorySchema = z.object({
	name: z
		.string({ error: () => m.validation_name_required() })
		.trim()
		.min(1, { error: () => m.validation_name_required() })
		.max(100, { error: () => m.validation_category_name_max() }),
	description: z
		.string({ error: () => m.validation_description_max() })
		.trim()
		.max(500, { error: () => m.validation_description_max() })
		.default('')
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
