import { getRequestEvent } from '$app/server';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { captcha, username } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { database } from '$lib/server/db';
import { serverConfig } from '$lib/server/env';
import * as authSchema from '$lib/server/db/schema/auth';
import { user } from '$lib/server/db/schema/auth';
import * as m from '$lib/paraglide/messages.js';

function configureAuth() {
	const db = database();
	const config = serverConfig();

	return betterAuth({
		appName: 'mayb-log',
		baseURL: config.siteUrl,
		secret: config.betterAuthSecret,
		trustedOrigins: [config.siteUrl],
		database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
		advanced: { database: { joins: true } },
		emailAndPassword: {
			enabled: true,
			autoSignIn: false
		},
		session: {
			cookieCache: { enabled: true, maxAge: 120 }
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
						const [account] = await db
							.select({ approved: user.approved })
							.from(user)
							.where(eq(user.id, session.userId))
							.limit(1);
						if (!account?.approved) {
							throw new APIError('FORBIDDEN', { message: m.account_unapproved() });
						}
					}
				}
			}
		},
		plugins: [
			username({ displayUsername: false, immutableUsername: true }),
			captcha({
				provider: 'cloudflare-turnstile',
				secretKey: config.turnstileSecretKey,
				endpoints: ['/sign-up/email', '/sign-in/username']
			}),
			sveltekitCookies(getRequestEvent)
		]
	});
}

let auth: ReturnType<typeof configureAuth> | undefined;

export function createAuth() {
	return (auth ??= configureAuth());
}
