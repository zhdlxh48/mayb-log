<script lang="ts">
	import Pagination from '$lib/components/Pagination.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import PostRow from '$lib/components/PostRow.svelte';
	import Seo from '$lib/components/Seo.svelte';
	let { data } = $props();
</script>

<Seo title="Posts" description="전체 글 목록" canonical={`${data.siteUrl}/posts`} />
<PageHeader
	title="Posts"
	action={data.user ? { href: '/posts/new', label: 'New Post' } : undefined}
/>
{#if data.items.length}
	{#each data.items as post}<PostRow {post} />{/each}
{:else}
	<p>아직 공개된 글이 없습니다.</p>
{/if}
<Pagination pager={data.pager} path="/posts" />
