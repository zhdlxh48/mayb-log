<script lang="ts">
	import { onMount } from 'svelte';
	import { getLocale } from '$lib/paraglide/runtime.js';

	let { value, time = false } = $props<{ value: Date | string | null; time?: boolean }>();
	let mounted = $state(false);
	const date = $derived(value ? new Date(value) : null);
	const iso = $derived(date && !Number.isNaN(date.getTime()) ? date.toISOString() : '');
	const text = $derived.by(() => {
		if (!date || !iso) return '';
		const options: Intl.DateTimeFormatOptions = time
			? { dateStyle: 'medium', timeStyle: 'short' }
			: { dateStyle: 'medium' };
		return new Intl.DateTimeFormat(
			getLocale(),
			mounted ? options : { ...options, timeZone: 'Asia/Seoul' }
		).format(date);
	});

	onMount(() => {
		mounted = true;
	});
</script>

{#if iso}<time datetime={iso}>{text}</time>{/if}
