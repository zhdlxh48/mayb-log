<script lang="ts">
	import type { pagination } from '$lib/pagination';
	import * as m from '$lib/paraglide/messages.js';

	let {
		pager,
		path,
		params = ''
	} = $props<{
		pager: ReturnType<typeof pagination>;
		path: string;
		params?: string;
	}>();

	function url(page: number) {
		const query = new URLSearchParams(params);
		if (page > 1) query.set('page', String(page));
		else query.delete('page');
		return query.size ? `${path}?${query}` : path;
	}
</script>

<nav class="pagination" aria-label={m.pagination_label()}>
	{#if pager.current > 1}<a href={url(1)} aria-label={m.first_page()}>&lt;&lt;</a>{:else}<span
			aria-disabled="true">&lt;&lt;</span
		>{/if}
	{#if pager.previousBlock}<a href={url(pager.previousBlock)} aria-label={m.previous_block()}
			>&lt;</a
		>{:else}<span aria-disabled="true">&lt;</span>{/if}
	{#each pager.pages as page}
		{#if page === pager.current}<span aria-current="page">{page}</span>{:else}<a href={url(page)}
				>{page}</a
			>{/if}
	{/each}
	{#if pager.nextBlock}<a href={url(pager.nextBlock)} aria-label={m.next_block()}>&gt;</a
		>{:else}<span aria-disabled="true">&gt;</span>{/if}
	{#if pager.current < pager.last}<a href={url(pager.last)} aria-label={m.last_page()}>&gt;&gt;</a
		>{:else}<span aria-disabled="true">&gt;&gt;</span>{/if}
</nav>

<style>
	.pagination {
		display: flex;
		gap: 0.65rem;
		margin-block: 1rem;
		font-size: 0.9rem;
	}
	[aria-current='page'] {
		font-weight: 700;
		text-decoration: underline;
	}
	[aria-disabled='true'] {
		color: var(--muted-color);
	}
</style>
