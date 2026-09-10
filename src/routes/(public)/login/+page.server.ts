import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { loginSchema } from '$lib/validation/auth';
import { authHeaders, authMessage } from '$lib/server/auth/forms';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => ({
	form: await superValidate({ next: url.searchParams.get('next') ?? '' }, zod4(loginSchema))
});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(loginSchema));
		if (!form.valid) return fail(400, { form });
		try {
			await locals.auth.api.signInUsername({
				body: { username: form.data.username, password: form.data.password },
				headers: authHeaders(request, form.data.captcha)
			});
		} catch (error) {
			return fail(400, { form, error: authMessage(error) });
		}
		const next = form.data.next;
		redirect(303, next.startsWith('/') && !next.startsWith('//') ? next : '/profile');
	}
};
