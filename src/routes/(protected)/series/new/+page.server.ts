import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { requestDb } from '$lib/server/db/request';
import { saveSeries } from '$lib/server/db/queries/taxonomy';
import { seriesSchema } from '$lib/validation/content';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ form: await superValidate(zod4(seriesSchema)) });

export const actions: Actions = {
	default: async ({ request, platform }) => {
		const form = await superValidate(request, zod4(seriesSchema));
		if (!form.valid) return fail(400, { form });
		try {
			await saveSeries(requestDb(platform), form.data);
		} catch {
			return fail(400, { form, error: '같은 제목의 시리즈가 이미 있습니다.' });
		}
		redirect(303, '/series');
	}
};
