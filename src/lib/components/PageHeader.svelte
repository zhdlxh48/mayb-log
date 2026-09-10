<script lang="ts">
	let { title, action } = $props<{
		title: string;
		action?: { href: string; label: string };
	}>();
</script>

<header>
	<h1>{title}</h1>
	{#if action}<a href={action.href}>{action.label}</a>{/if}
</header>

<style>
	header {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		margin-bottom: 1.1rem;
	}
	h1 {
		margin: 0;
	}
</style>
