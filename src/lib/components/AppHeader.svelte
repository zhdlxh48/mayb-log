<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages.js';
	import { getLocale, setLocale, type Locale } from '$lib/paraglide/runtime.js';

	let { user } = $props<{ user: App.Locals['user'] }>();

	function current(path: string) {
		return path === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(path);
	}
</script>

<header class="site-header">
	<nav aria-label={m.nav_label()}>
		<a class="brand" href="/" aria-current={current('/') ? 'page' : undefined}>mayb-log</a>
		<div class="links">
			<a href="/posts" aria-current={current('/posts') ? 'page' : undefined}>{m.nav_posts()}</a>
			<a href="/series" aria-current={current('/series') ? 'page' : undefined}>{m.nav_series()}</a>
			<a href="/categories" aria-current={current('/categories') ? 'page' : undefined}
				>{m.nav_categories()}</a
			>
			<a href="/archive" aria-current={current('/archive') ? 'page' : undefined}
				>{m.nav_archive()}</a
			>
			<a href="/search" aria-current={current('/search') ? 'page' : undefined}>{m.nav_search()}</a>
			{#if user}
				<a href="/drafts" aria-current={current('/drafts') ? 'page' : undefined}>{m.nav_drafts()}</a
				>
				<a href="/profile" aria-current={current('/profile') ? 'page' : undefined}
					>{m.nav_profile()}</a
				>
			{:else}
				<a href="/login" data-sveltekit-reload aria-current={current('/login') ? 'page' : undefined}
					>{m.nav_login()}</a
				>
			{/if}
			<label class="language"
				>{m.language_label()}<select
					id="language"
					name="language"
					aria-label={m.language_label()}
					autocomplete="language"
					value={getLocale()}
					onchange={(event) => setLocale(event.currentTarget.value as Locale)}
					><option value="ko">한국어</option><option value="ja">日本語</option><option value="en"
						>English</option
					></select
				></label
			>
		</div>
	</nav>
</header>

<style>
	.site-header {
		width: min(calc(100% - 2rem), 1040px);
		margin-inline: auto;
		padding-block: 0.9rem 0.4rem;
	}
	nav {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: baseline;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.35rem 0.9rem;
	}
	.brand {
		font-weight: 700;
		color: #222;
		text-decoration: none;
		white-space: nowrap;
	}
	.links a[aria-current='page'] {
		font-weight: 700;
	}
	.language {
		display: flex;
		gap: 0.25rem;
		align-items: baseline;
		color: var(--muted-color);
		font-size: 0.82rem;
	}
	.language select {
		width: auto;
		min-height: 1.7rem;
		padding: 0.05rem 0.2rem;
	}
	@media (max-width: 640px) {
		.site-header {
			width: min(calc(100% - 1.25rem), 1040px);
		}
		nav {
			flex-direction: column;
			align-items: stretch;
			gap: 0.45rem;
		}
		.links {
			justify-content: flex-start;
			gap: 0.25rem 0.7rem;
		}
	}
</style>
