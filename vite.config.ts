import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vite';

function cspSafeAnnouncer() {
	return {
		name: 'csp-safe-svelte-announcer',
		enforce: 'pre' as const,
		transform(code: string, id: string) {
			if (!id.endsWith('/.svelte-kit/generated/root.svelte')) return;
			return code.replace(/ style="position: absolute;[^"\n]+"/, ' class="svelte-announcer"');
		}
	};
}

export default defineConfig({
	plugins: [
		cspSafeAnnouncer(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			strategy: ['cookie', 'preferredLanguage', 'baseLocale']
		})
	]
});
