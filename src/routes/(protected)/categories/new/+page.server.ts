import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { requestDb } from '$lib/server/db/request';
import { saveCategory } from '$lib/server/db/queries/taxonomy';
import { categorySchema } from '$lib/validation/content';
import { requireUser } from '$lib/server/auth/guards';
import { isUniqueConflict } from '$lib/server/db/errors';
import type { Actions, PageServerLoad } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async () => ({
	form: await superValidate(zod4(categorySchema))
});

export const actions: Actions = {
	default: async ({ request, platform }) => {
		requireUser();
		const form = await superValidate(request, zod4(categorySchema));
		if (!form.valid) return fail(400, { form });
		try {
			await saveCategory(requestDb(platform), form.data);
		} catch (cause) {
			if (isUniqueConflict(cause)) return fail(409, { form, error: m.category_conflict() });
			throw cause;
		}
		redirect(303, '/categories');
	}
};
