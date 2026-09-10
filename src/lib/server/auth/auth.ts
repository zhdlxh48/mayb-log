import { getRequestEvent } from '$app/server';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { admin, captcha, username } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { database } from '$lib/server/db';
import * as authSchema from '$lib/server/db/schema/auth';
import { user } from '$lib/server/db/schema/auth';

export function createAuth(platform: App.Platform) {
	const db = database(platform.env.DB);

	return betterAuth({
		appName: 'mayb-log',
		baseURL: platform.env.SITE_URL,
		secret: platform.env.BETTER_AUTH_SECRET,
		trustedOrigins: [platform.env.SITE_URL],
		database: drizzleAdapter(db, { provider: 'sqlite', schema: authSchema }),
		advanced: {
			database: { joins: true },
			backgroundTasks: { handler: (promise) => platform.ctx.waitUntil(promise) }
		},
		emailAndPassword: {
			enabled: true,
			autoSignIn: false
		},
		disabledPaths: ['/is-username-available'],
		user: {
			additionalFields: {
				approved: { type: 'boolean', defaultValue: false, input: false }
			}
		},
		databaseHooks: {
			session: {
				create: {
					before: async (session) => {
						const account = await db
							.select({ approved: user.approved, banned: user.banned })
							.from(user)
							.where(eq(user.id, session.userId))
							.get();
						if (!account?.approved) {
							throw new APIError('FORBIDDEN', { message: '승인 대기 중입니다.' });
						}
						if (account.banned) {
							throw new APIError('FORBIDDEN', { message: '정지된 계정입니다.' });
						}
					}
				}
			}
		},
		plugins: [
			admin(),
			username({ displayUsername: false, immutableUsername: true }),
			captcha({
				provider: 'cloudflare-turnstile',
				secretKey: platform.env.TURNSTILE_SECRET_KEY,
				endpoints: ['/sign-up/email', '/sign-in/username']
			}),
			sveltekitCookies(getRequestEvent)
		]
	});
}
