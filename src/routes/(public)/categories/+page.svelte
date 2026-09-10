<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	let { data } = $props();
</script>

<Seo title="Categories" description="카테고리 목록" canonical={`${data.siteUrl}/categories`} />
<PageHeader
	title="Categories"
	action={data.user ? { href: '/categories/new', label: 'New Category' } : undefined}
/>
<table>
	<thead><tr><th>Name</th><th>Posts</th><th>Action</th></tr></thead>
	<tbody>
		{#each data.items as item}
			<tr>
				<td
					><a href={`/search?category=${item.id}`}>{item.name}</a>{#if item.description}<small
							>{item.description}</small
						>{/if}</td
				>
				<td>{item.count}</td><td
					>{#if data.user}<a href={`/categories/${item.id}/edit`}>Edit</a>{/if}</td
				>
			</tr>
		{:else}<tr><td colspan="3">등록된 카테고리가 없습니다.</td></tr>{/each}
	</tbody>
</table>

<style>
	small {
		display: block;
	}
</style>
