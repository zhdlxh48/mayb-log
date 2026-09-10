// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Error {
			message: string;
		}
		interface Locals {
			auth: ReturnType<typeof import('$lib/server/auth/auth').createAuth>;
			session:
				| ReturnType<
						typeof import('$lib/server/auth/auth').createAuth
				  >['$Infer']['Session']['session']
				| null;
			user:
				| ReturnType<typeof import('$lib/server/auth/auth').createAuth>['$Infer']['Session']['user']
				| null;
		}
		// interface PageData {}
		// interface PageState {}
	}

	interface Env {
		DB: D1Database;
		MEDIA: R2Bucket;
		BETTER_AUTH_SECRET: string;
		TURNSTILE_SECRET_KEY: string;
		SITE_URL: string;
		TURNSTILE_SITE_KEY: string;
	}
}

export {};
