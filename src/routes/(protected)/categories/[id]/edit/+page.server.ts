import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { getCategory, removeCategory, saveCategory } from '$lib/server/db/queries/taxonomy';
import { requestDb } from '$lib/server/db/request';
import { categorySchema } from '$lib/validation/content';
import { requireUser } from '$lib/server/auth/guards';
import { isUniqueConflict } from '$lib/server/db/errors';
import type { Actions, PageServerLoad } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({ params, platform }) => {
	requireUser();
	const item = await getCategory(requestDb(platform), Number(params.id));
	if (!item) error(404, m.category_not_found());
	return { item, form: await superValidate(item, zod4(categorySchema)) };
};

export const actions: Actions = {
	save: async ({ params, request, platform }) => {
		requireUser();
		const form = await superValidate(request, zod4(categorySchema));
		if (!form.valid) return fail(400, { form });
		try {
			await saveCategory(requestDb(platform), form.data, Number(params.id));
		} catch (cause) {
			if (isUniqueConflict(cause)) return fail(409, { form, error: m.category_conflict() });
			throw cause;
		}
		redirect(303, '/categories');
	},
	delete: async ({ params, platform }) => {
		requireUser();
		if (!(await removeCategory(requestDb(platform), Number(params.id))))
			error(404, m.category_not_found());
		redirect(303, '/categories');
	}
};
