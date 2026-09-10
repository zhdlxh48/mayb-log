import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth/guards';
import { isUniqueConflict } from '$lib/server/db/errors';
import { createPost } from '$lib/server/db/queries/posts';
import { getPostOptions } from '$lib/server/db/queries/taxonomy';
import { requestDb } from '$lib/server/db/request';
import { postSchema } from '$lib/validation/content';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import * as m from '$lib/paraglide/messages.js';

const assetIdSchema = z.string().uuid();

export const load: PageServerLoad = async ({ platform }) => ({
	form: await superValidate(zod4(postSchema)),
	options: await getPostOptions(requestDb(platform)),
	assetId: crypto.randomUUID()
});

async function save(event: RequestEvent, action: 'saveDraft' | 'publish') {
	const user = requireUser();
	const data = await event.request.formData();
	const form = await superValidate(data, zod4(postSchema));
	const assetId = assetIdSchema.safeParse(data.get('assetId'));
	if (!form.valid || !assetId.success) return fail(400, { form });
	let post: Awaited<ReturnType<typeof createPost>>;
	try {
		post = await createPost(requestDb(event.platform), form.data, user.id, assetId.data, action);
	} catch (cause) {
		if (isUniqueConflict(cause)) return fail(409, { form, error: m.post_conflict() });
		throw cause;
	}
	if (!post.publishedAt || post.publishedAt > new Date())
		redirect(303, `/posts/${post.id}/edit?saved=1`);
	redirect(303, `/posts/${post.id}`);
}

export const actions: Actions = {
	saveDraft: (event) => save(event, 'saveDraft'),
	publish: (event) => save(event, 'publish')
};
