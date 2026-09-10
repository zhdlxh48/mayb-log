<script lang="ts">
	import '../global.css';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<AppHeader user={data.user} />
<main class="site-main">{@render children()}</main>
<footer class="site-footer">© {new Date().getFullYear()} mayb-log</footer>

<style>
	.site-main,
	.site-footer {
		width: min(calc(100% - 2rem), 1040px);
		margin-inline: auto;
	}
	.site-main {
		padding-block: 1.4rem 2.5rem;
	}
	.site-footer {
		padding-block: 1rem 2rem;
		color: var(--muted-color);
		font-size: 0.85rem;
	}
	@media (max-width: 640px) {
		.site-main,
		.site-footer {
			width: min(calc(100% - 1.25rem), 1040px);
		}
	}
</style>
