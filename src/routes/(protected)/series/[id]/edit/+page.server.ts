import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { getSeries, removeSeries, saveSeries } from '$lib/server/db/queries/taxonomy';
import { requestDb } from '$lib/server/db/request';
import { seriesSchema } from '$lib/validation/content';
import { requireUser } from '$lib/server/auth/guards';
import { isUniqueConflict } from '$lib/server/db/errors';
import type { Actions, PageServerLoad } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({ params, platform }) => {
	requireUser();
	const item = await getSeries(requestDb(platform), Number(params.id));
	if (!item) error(404, m.series_not_found());
	return { item, form: await superValidate(item, zod4(seriesSchema)) };
};

export const actions: Actions = {
	save: async ({ params, request, platform }) => {
		requireUser();
		const form = await superValidate(request, zod4(seriesSchema));
		if (!form.valid) return fail(400, { form });
		try {
			await saveSeries(requestDb(platform), form.data, Number(params.id));
		} catch (cause) {
			if (isUniqueConflict(cause)) return fail(409, { form, error: m.series_conflict() });
			throw cause;
		}
		redirect(303, '/series');
	},
	delete: async ({ params, platform }) => {
		requireUser();
		await removeSeries(requestDb(platform), Number(params.id));
		redirect(303, '/series');
	}
};
