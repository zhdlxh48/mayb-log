import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { postSchema } from '$lib/validation/content';
import { createPost } from '$lib/server/db/queries/posts';
import { getPostOptions } from '$lib/server/db/queries/taxonomy';
import { requestDb } from '$lib/server/db/request';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async ({ platform }) => ({
	form: await superValidate(zod4(postSchema)),
	options: await getPostOptions(requestDb(platform))
});

async function save(event: RequestEvent, draft: boolean) {
	const form = await superValidate(event.request, zod4(postSchema));
	if (!form.valid) return fail(400, { form });
	let id: number;
	try {
		id = await createPost(requestDb(event.platform), form.data, event.locals.user!.id, draft);
	} catch {
		return fail(400, { form, error: '글을 저장하지 못했습니다. 시리즈 순서를 확인하세요.' });
	}
	const scheduled =
		!draft && form.data.publishedAt && new Date(`${form.data.publishedAt}:00+09:00`) > new Date();
	redirect(303, draft || scheduled ? `/posts/${id}/edit?saved=1` : `/posts/${id}`);
}

export const actions: Actions = {
	saveDraft: (event) => save(event, true),
	publish: (event) => save(event, false)
};
