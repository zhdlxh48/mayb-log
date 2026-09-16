import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { database } from '$lib/server/db';
import { saveSeries } from '$lib/server/db/queries/taxonomy/write';
import { seriesSchema } from '$lib/validation/content';
import { requireUser } from '$lib/server/auth/guards';
import { isUniqueConflict } from '$lib/server/db/errors';
import type { Actions, PageServerLoad } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async () => {
	requireUser();
	return { form: await superValidate(zod4(seriesSchema)) };
};

export const actions: Actions = {
	default: async ({ request }) => {
		requireUser();
		const form = await superValidate(request, zod4(seriesSchema));
		if (!form.valid) return fail(400, { form });
		try {
			await saveSeries(database(), form.data);
		} catch (cause) {
			if (isUniqueConflict(cause)) return fail(409, { form, error: m.series_conflict() });
			throw cause;
		}
		redirect(303, '/series');
	}
};
