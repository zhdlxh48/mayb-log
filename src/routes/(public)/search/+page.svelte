<script lang="ts">
	import Pagination from '$lib/components/Pagination.svelte';
	import PostRow from '$lib/components/PostRow.svelte';
	import Seo from '$lib/components/Seo.svelte';
	let { data } = $props();
</script>

<Seo title="Search" description="글 검색" canonical={`${data.siteUrl}/search`} noindex />
<h1>Search</h1>
<form method="GET" class="form-grid">
	<label for="q">Query</label><input id="q" name="q" value={data.filters.q} />
	<span>Series</span>
	<fieldset>
		{#each data.options.series as item}<label
				><input
					type="checkbox"
					name="series"
					value={item.id}
					checked={data.filters.series.includes(item.id)}
				/>
				{item.title}</label
			>{/each}
	</fieldset>
	<span>Categories</span>
	<fieldset>
		{#each data.options.categories as item}<label
				><input
					type="checkbox"
					name="category"
					value={item.id}
					checked={data.filters.categories.includes(item.id)}
				/>
				{item.name}</label
			>{/each}
	</fieldset>
	<label for="tags">Tags</label><input
		id="tags"
		name="tag"
		value={data.filters.tags.join(', ')}
		placeholder="태그 하나"
	/>
	<label for="from">From</label><input
		id="from"
		type="date"
		name="from"
		value={data.filters.from}
	/>
	<label for="to">To</label><input id="to" type="date" name="to" value={data.filters.to} />
	<span></span><button type="submit">Search</button>
</form>
<section aria-label="검색 결과">
	{#each data.items as post}<PostRow {post} />{:else}<p>검색 결과가 없습니다.</p>{/each}
</section>
<Pagination pager={data.pager} path="/search" params={data.query} />

<style>
	fieldset {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1rem;
		margin: 0;
		padding: 0.45rem 0;
		border: 0;
	}
	fieldset label {
		margin: 0;
		white-space: nowrap;
	}
</style>
