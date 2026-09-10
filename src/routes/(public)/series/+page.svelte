<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	let { data } = $props();
</script>

<Seo title="Series" description="시리즈 목록" canonical={`${data.siteUrl}/series`} />
<header>
	<h1>Series</h1>
	{#if data.user}<a href="/series/new">New Series</a>{/if}
</header>
<table>
	<thead><tr><th>Title</th><th>Posts</th><th>Action</th></tr></thead>
	<tbody>
		{#each data.items as item}
			<tr>
				<td
					><a href={`/search?series=${item.id}`}>{item.title}</a>{#if item.description}<small
							>{item.description}</small
						>{/if}</td
				>
				<td>{item.count}</td><td
					>{#if data.user}<a href={`/series/${item.id}/edit`}>Edit</a>{/if}</td
				>
			</tr>
		{:else}<tr><td colspan="3">등록된 시리즈가 없습니다.</td></tr>{/each}
	</tbody>
</table>

<style>
	header {
		display: flex;
		gap: 1rem;
		align-items: baseline;
	}
	small {
		display: block;
		color: var(--pico-muted-color);
	}
</style>
