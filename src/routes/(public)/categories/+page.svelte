<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { data } = $props();
</script>

<Seo
	title={m.categories_title()}
	description={m.categories_description()}
	canonical={`${data.siteUrl}/categories`}
/>
<PageHeader
	title={m.categories_title()}
	action={data.user ? { href: '/categories/new', label: m.new_category() } : undefined}
/>
<table>
	<thead><tr><th>{m.name()}</th><th>{m.posts_count()}</th><th>{m.action()}</th></tr></thead>
	<tbody>
		{#each data.items as item}
			<tr>
				<td
					><a href={`/search?category=${item.id}`}>{item.name}</a>{#if item.description}<small
							>{item.description}</small
						>{/if}</td
				>
				<td>{item.count}</td><td
					>{#if data.user}<a href={`/categories/${item.id}/edit`}>{m.edit()}</a>{/if}</td
				>
			</tr>
		{:else}<tr><td colspan="3">{m.empty_categories()}</td></tr>{/each}
	</tbody>
</table>

<style>
	small {
		display: block;
	}
</style>
