import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { getSeries } from '$lib/server/db/queries/taxonomy/read';
import { removeSeries, saveSeries } from '$lib/server/db/queries/taxonomy/write';
import { requestDb } from '$lib/server/db/request';
import { seriesSchema } from '$lib/validation/content';
import { requireUser } from '$lib/server/auth/guards';
import { isUniqueConflict } from '$lib/server/db/errors';
import { positiveIntegerParam } from '$lib/params';
import type { Actions, PageServerLoad } from './$types';
import * as m from '$lib/paraglide/messages.js';

function routeId(value: string) {
	const id = positiveIntegerParam(value);
	if (id === null) error(404, m.series_not_found());
	return id;
}

export const load: PageServerLoad = async ({ params, platform }) => {
	requireUser();
	const item = await getSeries(requestDb(platform), routeId(params.id));
	if (!item) error(404, m.series_not_found());
	return { item, form: await superValidate(item, zod4(seriesSchema)) };
};

export const actions: Actions = {
	save: async ({ params, request, platform }) => {
		requireUser();
		const id = routeId(params.id);
		const form = await superValidate(request, zod4(seriesSchema));
		if (!form.valid) return fail(400, { form });
		try {
			if (!(await saveSeries(requestDb(platform), form.data, id)))
				return fail(409, { form, error: m.taxonomy_changed() });
		} catch (cause) {
			if (isUniqueConflict(cause)) return fail(409, { form, error: m.series_conflict() });
			throw cause;
		}
		redirect(303, '/series');
	},
	delete: async ({ params, platform }) => {
		requireUser();
		if (!(await removeSeries(requestDb(platform), routeId(params.id))))
			error(404, m.series_not_found());
		redirect(303, '/series');
	}
};
