<script lang="ts">
	import type { pagination } from '$lib/pagination';

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

{#if pager.last > 1}
	<nav class="pagination" aria-label="페이지 이동">
		{#if pager.current > 1}<a href={url(1)} aria-label="첫 페이지">&lt;&lt;</a>{/if}
		{#if pager.previousBlock}<a href={url(pager.previousBlock)} aria-label="이전 페이지 묶음"
				>&lt;</a
			>{/if}
		{#each pager.pages as page}
			{#if page === pager.current}<span aria-current="page">{page}</span>{:else}<a href={url(page)}
					>{page}</a
				>{/if}
		{/each}
		{#if pager.nextBlock}<a href={url(pager.nextBlock)} aria-label="다음 페이지 묶음">&gt;</a>{/if}
		{#if pager.current < pager.last}<a href={url(pager.last)} aria-label="마지막 페이지">&gt;&gt;</a
			>{/if}
	</nav>
{/if}

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
</style>
