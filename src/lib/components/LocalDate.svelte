<script lang="ts">
	import { onMount } from 'svelte';
	import { getLocale } from '$lib/paraglide/runtime.js';

	let { value, time = false } = $props<{ value: Date | string | null; time?: boolean }>();
	const date = $derived(value ? new Date(value) : null);
	const iso = $derived(date && !Number.isNaN(date.getTime()) ? date.toISOString() : '');
	function initialText() {
		return iso;
	}
	let text = $state(initialText());

	onMount(() => {
		if (!date) return;
		text = new Intl.DateTimeFormat(
			getLocale(),
			time ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }
		).format(date);
	});
</script>

{#if date}<time datetime={iso}>{text}</time>{/if}
