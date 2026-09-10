import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { requestDb } from '$lib/server/db/request';
import { saveCategory } from '$lib/server/db/queries/taxonomy';
import { categorySchema } from '$lib/validation/content';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	form: await superValidate(zod4(categorySchema))
});

export const actions: Actions = {
	default: async ({ request, platform }) => {
		const form = await superValidate(request, zod4(categorySchema));
		if (!form.valid) return fail(400, { form });
		try {
			await saveCategory(requestDb(platform), form.data);
		} catch {
			return fail(400, { form, error: '같은 이름의 카테고리가 이미 있습니다.' });
		}
		redirect(303, '/categories');
	}
};
