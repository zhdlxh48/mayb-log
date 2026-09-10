import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { passwordSchema, profileSchema } from '$lib/validation/auth';
import { authMessage } from '$lib/server/auth/forms';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	profileForm: await superValidate({ name: locals.user!.name }, zod4(profileSchema)),
	passwordForm: await superValidate(zod4(passwordSchema))
});

export const actions: Actions = {
	profile: async ({ request, locals }) => {
		const profileForm = await superValidate(request, zod4(profileSchema));
		if (!profileForm.valid) return fail(400, { profileForm });
		try {
			await locals.auth.api.updateUser({
				body: { name: profileForm.data.name },
				headers: request.headers
			});
			return { profileForm, success: '프로필을 저장했습니다.' };
		} catch (error) {
			return fail(400, { profileForm, error: authMessage(error) });
		}
	},
	password: async ({ request, locals }) => {
		const passwordForm = await superValidate(request, zod4(passwordSchema));
		if (!passwordForm.valid) return fail(400, { passwordForm });
		try {
			await locals.auth.api.changePassword({
				body: {
					currentPassword: passwordForm.data.currentPassword,
					newPassword: passwordForm.data.newPassword,
					revokeOtherSessions: true
				},
				headers: request.headers
			});
			return { passwordForm, success: '비밀번호를 변경했습니다.' };
		} catch (error) {
			return fail(400, { passwordForm, error: authMessage(error) });
		}
	},
	logout: async ({ request, locals }) => {
		await locals.auth.api.signOut({ headers: request.headers });
		redirect(303, '/');
	}
};
