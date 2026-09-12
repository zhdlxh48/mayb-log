// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Cloudflare.Env;
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
}

export {};
