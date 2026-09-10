import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { getSeries, removeSeries, saveSeries } from '$lib/server/db/queries/taxonomy';
import { requestDb } from '$lib/server/db/request';
import { seriesSchema } from '$lib/validation/content';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const item = await getSeries(requestDb(platform), Number(params.id));
	if (!item) error(404, '시리즈를 찾을 수 없습니다.');
	return { item, form: await superValidate(item, zod4(seriesSchema)) };
};

export const actions: Actions = {
	save: async ({ params, request, platform }) => {
		const form = await superValidate(request, zod4(seriesSchema));
		if (!form.valid) return fail(400, { form });
		try {
			await saveSeries(requestDb(platform), form.data, Number(params.id));
		} catch {
			return fail(400, { form, error: '같은 제목의 시리즈가 이미 있습니다.' });
		}
		redirect(303, '/series');
	},
	delete: async ({ params, platform }) => {
		await removeSeries(requestDb(platform), Number(params.id));
		redirect(303, '/series');
	}
};
