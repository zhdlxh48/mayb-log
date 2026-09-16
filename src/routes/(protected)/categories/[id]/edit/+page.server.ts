import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { getCategory } from '$lib/server/db/queries/taxonomy/read';
import { removeCategory, saveCategory } from '$lib/server/db/queries/taxonomy/write';
import { database } from '$lib/server/db';
import { categorySchema } from '$lib/validation/content';
import { requireUser } from '$lib/server/auth/guards';
import { isUniqueConflict } from '$lib/server/db/errors';
import { positiveIntegerParam } from '$lib/params';
import type { Actions, PageServerLoad } from './$types';
import * as m from '$lib/paraglide/messages.js';

function routeId(value: string) {
	const id = positiveIntegerParam(value);
	if (id === null) error(404, m.category_not_found());
	return id;
}

export const load: PageServerLoad = async ({ params }) => {
	requireUser();
	const item = await getCategory(database(), routeId(params.id));
	if (!item) error(404, m.category_not_found());
	return { item, form: await superValidate(item, zod4(categorySchema)) };
};

export const actions: Actions = {
	save: async ({ params, request }) => {
		requireUser();
		const id = routeId(params.id);
		const form = await superValidate(request, zod4(categorySchema));
		if (!form.valid) return fail(400, { form });
		try {
			if (!(await saveCategory(database(), form.data, id)))
				return fail(409, { form, error: m.taxonomy_changed() });
		} catch (cause) {
			if (isUniqueConflict(cause)) return fail(409, { form, error: m.category_conflict() });
			throw cause;
		}
		redirect(303, '/categories');
	},
	delete: async ({ params }) => {
		requireUser();
		if (!(await removeCategory(database(), routeId(params.id)))) error(404, m.category_not_found());
		redirect(303, '/categories');
	}
};
