<script lang="ts">
	import Pagination from '$lib/components/Pagination.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import PostRow from '$lib/components/PostRow.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { data } = $props();
</script>

<Seo
	title={m.posts_title()}
	description={m.posts_description()}
	canonical={`${data.siteUrl}/posts${data.pager.current > 1 ? `?page=${data.pager.current}` : ''}`}
/>
<PageHeader
	title={m.posts_title()}
	action={data.user ? { href: '/posts/new', label: m.new_post() } : undefined}
/>
{#if data.items.length}
	{#each data.items as post}<PostRow {post} />{/each}
{:else}
	<p>{m.empty_posts()}</p>
{/if}
<Pagination pager={data.pager} path="/posts" />
