// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Error {
			message: string;
		}
		interface Locals {
			auth: ReturnType<typeof import('$lib/server/auth/auth').createAuth> | null;
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
