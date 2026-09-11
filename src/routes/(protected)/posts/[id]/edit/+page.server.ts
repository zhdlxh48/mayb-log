import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { dateTimeLocal } from '$lib/dates';
import { requireUser } from '$lib/server/auth/guards';
import { isUniqueConflict } from '$lib/server/db/errors';
import {
	deletePost,
	getEditablePost,
	updatePost,
	type PublicationAction
} from '$lib/server/db/queries/posts';
import { getEditorOptions } from '$lib/server/db/queries/taxonomy';
import { requestDb } from '$lib/server/db/request';
import { listPostImages } from '$lib/server/media/images';
import { postSchema } from '$lib/validation/content';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({ params, platform, url }) => {
	requireUser();
	const id = Number(params.id);
	if (!Number.isInteger(id) || !platform) error(404, m.post_not_found());
	const db = requestDb(platform);
	const [post, options] = await Promise.all([getEditablePost(db, id), getEditorOptions(db)]);
	if (!post) error(404, m.post_not_found());
	const status: 'draft' | 'scheduled' | 'published' =
		post.publishedAt === null ? 'draft' : post.publishedAt > new Date() ? 'scheduled' : 'published';
	return {
		post,
		options,
		images: await listPostImages(platform.env.MEDIA, post.assetId),
		form: await superValidate(
			{
				title: post.title,
				subtitle: post.subtitle ?? '',
				description: post.description,
				bodyMarkdown: post.bodyMarkdown,
				seriesId: post.seriesId,
				seriesPosition: post.seriesPosition,
				categories: post.categoryIds,
				tags: post.tags.join(', '),
				publishedAt: dateTimeLocal(post.publishedAt),
				noindex: post.noindex
			},
			zod4(postSchema)
		),
		saved: url.searchParams.has('saved'),
		status
	};
};

async function save(event: RequestEvent, action: PublicationAction) {
	requireUser();
	const id = Number(event.params.id);
	if (!Number.isInteger(id)) error(404, m.post_not_found());
	const form = await superValidate(event.request, zod4(postSchema));
	if (!form.valid) return fail(400, { form });
	let post: Awaited<ReturnType<typeof updatePost>>;
	try {
		post = await updatePost(requestDb(event.platform), id, form.data, action);
	} catch (cause) {
		if (isUniqueConflict(cause)) return fail(409, { form, error: m.post_conflict() });
		throw cause;
	}
	if (!post) error(404, m.post_not_found());
	if (!post.publishedAt || post.publishedAt > new Date())
		redirect(303, `/posts/${id}/edit?saved=1`);
	redirect(303, `/posts/${id}`);
}

export const actions: Actions = {
	saveDraft: (event) => save(event, 'saveDraft'),
	publish: (event) => save(event, 'publish'),
	save: (event) => save(event, 'save'),
	moveToDraft: (event) => save(event, 'moveToDraft'),
	delete: async ({ params, platform }) => {
		requireUser();
		const id = Number(params.id);
		if (!Number.isInteger(id) || !(await deletePost(requestDb(platform), id)))
			error(404, m.post_not_found());
		redirect(303, '/posts');
	}
};
