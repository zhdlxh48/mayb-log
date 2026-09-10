import { betterAuth } from 'better-auth';
import { admin, captcha, username } from 'better-auth/plugins';

export const auth = betterAuth({
	emailAndPassword: {
		enabled: true,
		autoSignIn: false
	},
	disabledPaths: ['/is-username-available'],
	user: {
		additionalFields: {
			approved: {
				type: 'boolean',
				defaultValue: false,
				input: false
			}
		}
	},
	plugins: [
		admin(),
		username({ displayUsername: false, immutableUsername: true }),
		captcha({
			provider: 'cloudflare-turnstile',
			secretKey: 'schema-generation-only',
			endpoints: ['/sign-up/email', '/sign-in/username']
		})
	]
});
