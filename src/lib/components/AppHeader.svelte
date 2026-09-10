<script lang="ts">
	import { page } from '$app/state';

	let { user } = $props<{ user: App.Locals['user'] }>();

	function current(path: string) {
		return path === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(path);
	}
</script>

<header class="site-header">
	<nav aria-label="주요 탐색">
		<a class="brand" href="/" aria-current={current('/') ? 'page' : undefined}>mayb-log</a>
		<div class="links">
			<a href="/posts" aria-current={current('/posts') ? 'page' : undefined}>Posts</a>
			<a href="/series" aria-current={current('/series') ? 'page' : undefined}>Series</a>
			<a href="/categories" aria-current={current('/categories') ? 'page' : undefined}>Categories</a
			>
			<a href="/archive" aria-current={current('/archive') ? 'page' : undefined}>Archive</a>
			<a href="/search" aria-current={current('/search') ? 'page' : undefined}>Search</a>
			{#if user}
				<a href="/drafts" aria-current={current('/drafts') ? 'page' : undefined}>Drafts</a>
				<a href="/profile" aria-current={current('/profile') ? 'page' : undefined}>Profile</a>
			{:else}
				<a href="/login" aria-current={current('/login') ? 'page' : undefined}>Login</a>
			{/if}
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
