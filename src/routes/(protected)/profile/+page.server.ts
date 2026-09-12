import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { passwordSchema, profileSchema } from '$lib/validation/auth';
import { authMessage, redactSensitiveAuthForm } from '$lib/server/auth/forms';
import { requireAuth, requireUser } from '$lib/server/auth/guards';
import type { Actions, PageServerLoad } from './$types';
import * as m from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async () => {
	const user = requireUser();
	return {
		profileForm: await superValidate({ name: user.name }, zod4(profileSchema)),
		passwordForm: await superValidate(zod4(passwordSchema))
	};
};

export const actions: Actions = {
	profile: async ({ request }) => {
		requireUser();
		const auth = requireAuth();
		const profileForm = await superValidate(request, zod4(profileSchema));
		if (!profileForm.valid) return fail(400, { profileForm });
		try {
			await auth.api.updateUser({
				body: { name: profileForm.data.name },
				headers: request.headers
			});
			return { profileForm, success: m.profile_saved() };
		} catch (error) {
			const message = authMessage(error);
			if (!message) throw error;
			return fail(400, { profileForm, error: message });
		}
	},
	password: async ({ request }) => {
		requireUser();
		const auth = requireAuth();
		const passwordForm = await superValidate(request, zod4(passwordSchema));
		if (!passwordForm.valid)
			return fail(400, { passwordForm: redactSensitiveAuthForm(passwordForm) });
		try {
			await auth.api.changePassword({
				body: {
					currentPassword: passwordForm.data.currentPassword,
					newPassword: passwordForm.data.newPassword,
					revokeOtherSessions: true
				},
				headers: request.headers
			});
			return {
				passwordForm: redactSensitiveAuthForm(passwordForm),
				success: m.password_changed()
			};
		} catch (error) {
			const message = authMessage(error);
			if (!message) throw error;
			return fail(400, {
				passwordForm: redactSensitiveAuthForm(passwordForm),
				error: message
			});
		}
	},
	logout: async ({ request }) => {
		requireUser();
		await requireAuth().api.signOut({ headers: request.headers });
		redirect(303, '/');
	}
};
