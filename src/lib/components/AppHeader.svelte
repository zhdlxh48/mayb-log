<script lang="ts">
	let { user } = $props<{ user: App.Locals['user'] }>();
</script>

<header class="site-header">
	<nav aria-label="주요 탐색">
		<a class="brand" href="/">mayb-log</a>
		<a href="/posts">Posts</a>
		<a href="/series">Series</a>
		<a href="/categories">Categories</a>
		<a href="/archive">Archive</a>
		<a href="/search">Search</a>
		{#if user}
			<a href="/drafts">Drafts</a>
			<a href="/profile">Profile</a>
		{:else}
			<a href="/login">Login</a>
		{/if}
	</nav>
</header>

<style>
	.site-header {
		padding-block: 0.8rem;
		border-bottom: 1px solid #d9dee3;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem 1rem;
		align-items: baseline;
	}
	.brand {
		font-weight: 700;
		color: #20252a;
		text-decoration: none;
	}
</style>
