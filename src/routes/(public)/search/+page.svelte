<script lang="ts">
	import Pagination from '$lib/components/Pagination.svelte';
	import PostRow from '$lib/components/PostRow.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { data } = $props();
</script>

<Seo
	title={m.search_title()}
	description={m.search_description()}
	canonical={`${data.siteUrl}/search`}
	noindex
/>
<h1>{m.search_title()}</h1>
<form method="GET" class="form-grid">
	<label for="q">{m.query()}</label><input id="q" name="q" value={data.filters.q} />
	<span>{m.series_title()}</span>
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
	<span>{m.categories_title()}</span>
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
	<label for="tags">{m.tags()}</label><input
		id="tags"
		name="tag"
		value={data.filters.tags.join(', ')}
		placeholder={m.tag_placeholder()}
	/>
	<label for="author">{m.author()}</label><select id="author" name="author"
		><option value="">{m.none()}</option
		>{#each data.options.authors as author}{#if author.username}<option
					value={author.username}
					selected={data.filters.author === author.username}>{author.name}</option
				>{/if}{/each}</select
	>
	<label for="from">{m.from()}</label><input
		id="from"
		type="date"
		name="from"
		value={data.filters.from}
	/>
	<label for="to">{m.to()}</label><input id="to" type="date" name="to" value={data.filters.to} />
	<span></span><button type="submit">{m.search_title()}</button>
</form>
<section aria-label={m.search_results()}>
	{#each data.items as post}<PostRow {post} />{:else}<p>{m.empty_search()}</p>{/each}
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
