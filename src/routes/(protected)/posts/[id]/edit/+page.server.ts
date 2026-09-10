import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { dateTimeLocal } from '$lib/dates';
import { deletePost, getEditablePost, updatePost } from '$lib/server/db/queries/posts';
import { getPostOptions } from '$lib/server/db/queries/taxonomy';
import { requestDb } from '$lib/server/db/request';
import { postSchema } from '$lib/validation/content';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async ({ params, platform, url }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404, '글을 찾을 수 없습니다.');
	const db = requestDb(platform);
	const [post, options] = await Promise.all([getEditablePost(db, id), getPostOptions(db)]);
	if (!post) error(404, '글을 찾을 수 없습니다.');
	return {
		post,
		options,
		form: await superValidate(
			{
				title: post.title,
				subtitle: post.subtitle ?? '',
				description: post.description,
				bodyMarkdown: post.bodyMarkdown,
				seriesId: post.seriesId,
				seriesPosition: post.seriesPosition,
				categories: options.categories
					.filter((item) => post.categories.includes(item.name))
					.map((item) => item.id),
				tags: post.tags.join(', '),
				publishedAt: dateTimeLocal(post.publishedAt),
				noindex: post.noindex
			},
			zod4(postSchema)
		),
		saved: url.searchParams.has('saved')
	};
};

async function save(event: RequestEvent, draft: boolean) {
	const id = Number(event.params.id);
	const form = await superValidate(event.request, zod4(postSchema));
	if (!form.valid) return fail(400, { form });
	if (!(await getEditablePost(requestDb(event.platform), id))) error(404, '글을 찾을 수 없습니다.');
	try {
		await updatePost(requestDb(event.platform), id, form.data, draft);
	} catch {
		return fail(400, { form, error: '글을 저장하지 못했습니다. 시리즈 순서를 확인하세요.' });
	}
	const scheduled =
		!draft && form.data.publishedAt && new Date(`${form.data.publishedAt}:00+09:00`) > new Date();
	redirect(303, draft || scheduled ? `/posts/${id}/edit?saved=1` : `/posts/${id}`);
}

export const actions: Actions = {
	saveDraft: (event) => save(event, true),
	publish: (event) => save(event, false),
	save: (event) => save(event, false),
	moveToDraft: (event) => save(event, true),
	delete: async ({ params, platform }) => {
		const id = Number(params.id);
		if (!Number.isInteger(id)) error(404, '글을 찾을 수 없습니다.');
		await deletePost(requestDb(platform), id);
		redirect(303, '/posts');
	}
};
