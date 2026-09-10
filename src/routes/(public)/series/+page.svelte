<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { data } = $props();
</script>

<Seo
	title={m.series_title()}
	description={m.series_description()}
	canonical={`${data.siteUrl}/series`}
/>
<PageHeader
	title={m.series_title()}
	action={data.user ? { href: '/series/new', label: m.new_series() } : undefined}
/>
<table>
	<thead><tr><th>{m.title()}</th><th>{m.posts_count()}</th><th>{m.action()}</th></tr></thead>
	<tbody>
		{#each data.items as item}
			<tr>
				<td
					><a href={`/search?series=${item.id}`}>{item.title}</a>{#if item.description}<small
							>{item.description}</small
						>{/if}</td
				>
				<td>{item.count}</td><td
					>{#if data.user}<a href={`/series/${item.id}/edit`}>{m.edit()}</a>{/if}</td
				>
			</tr>
		{:else}<tr><td colspan="3">{m.empty_series()}</td></tr>{/each}
	</tbody>
</table>

<style>
	small {
		display: block;
	}
</style>
