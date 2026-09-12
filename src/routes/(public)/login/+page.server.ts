import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { loginSchema } from '$lib/validation/auth';
import { authHeaders, authMessage, redactSensitiveAuthForm } from '$lib/server/auth/forms';
import { requireAuth } from '$lib/server/auth/guards';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => ({
	form: await superValidate({ next: url.searchParams.get('next') ?? '' }, zod4(loginSchema))
});

export const actions: Actions = {
	default: async ({ request, url }) => {
		const auth = requireAuth();
		const form = await superValidate(request, zod4(loginSchema));
		if (!form.valid) return fail(400, { form: redactSensitiveAuthForm(form) });
		try {
			await auth.api.signInUsername({
				body: { username: form.data.username, password: form.data.password },
				headers: authHeaders(request, form.data.captcha)
			});
		} catch (error) {
			const message = authMessage(error);
			if (!message) throw error;
			return fail(400, { form: redactSensitiveAuthForm(form), error: message });
		}
		const target = new URL(form.data.next || '/profile', url.origin);
		if (target.origin !== url.origin) redirect(303, '/profile');
		redirect(303, target.pathname + target.search + target.hash);
	}
};
