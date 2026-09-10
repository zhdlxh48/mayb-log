import { fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { signupSchema } from '$lib/validation/auth';
import { authHeaders, authMessage } from '$lib/server/auth/forms';
import type { Actions, PageServerLoad } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async () => ({ form: await superValidate(zod4(signupSchema)) });

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(signupSchema));
		if (!form.valid) return fail(400, { form });
		try {
			await locals.auth.api.signUpEmail({
				body: {
					email: form.data.email,
					name: form.data.name,
					password: form.data.password,
					username: form.data.username
				},
				headers: authHeaders(request, form.data.captcha)
			});
			return {
				form,
				success: m.signup_success()
			};
		} catch (error) {
			const message = authMessage(error);
			if (!message) throw error;
			return fail(400, { form, error: message });
		}
	}
};
