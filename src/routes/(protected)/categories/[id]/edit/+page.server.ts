import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { getCategory, removeCategory, saveCategory } from '$lib/server/db/queries/taxonomy';
import { requestDb } from '$lib/server/db/request';
import { categorySchema } from '$lib/validation/content';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const item = await getCategory(requestDb(platform), Number(params.id));
	if (!item) error(404, '카테고리를 찾을 수 없습니다.');
	return { item, form: await superValidate(item, zod4(categorySchema)) };
};

export const actions: Actions = {
	save: async ({ params, request, platform }) => {
		const form = await superValidate(request, zod4(categorySchema));
		if (!form.valid) return fail(400, { form });
		try {
			await saveCategory(requestDb(platform), form.data, Number(params.id));
		} catch {
			return fail(400, { form, error: '같은 이름의 카테고리가 이미 있습니다.' });
		}
		redirect(303, '/categories');
	},
	delete: async ({ params, platform }) => {
		await removeCategory(requestDb(platform), Number(params.id));
		redirect(303, '/categories');
	}
};
