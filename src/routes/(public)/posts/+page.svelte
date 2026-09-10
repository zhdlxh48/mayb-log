<script lang="ts">
	import Pagination from '$lib/components/Pagination.svelte';
	import PostRow from '$lib/components/PostRow.svelte';
	import Seo from '$lib/components/Seo.svelte';
	let { data } = $props();
</script>

<Seo title="Posts" description="전체 글 목록" canonical={`${data.siteUrl}/posts`} />
<header class="heading">
	<h1>Posts</h1>
	{#if data.user}<a href="/posts/new">New Post</a>{/if}
</header>
{#if data.items.length}
	{#each data.items as post}<PostRow {post} />{/each}
{:else}
	<p>아직 공개된 글이 없습니다.</p>
{/if}
<Pagination pager={data.pager} path="/posts" />

<style>
	.heading {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}
</style>
