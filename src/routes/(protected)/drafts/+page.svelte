<script lang="ts">
	import { koreanDate } from '$lib/dates';
	import Seo from '$lib/components/Seo.svelte';
	let { data } = $props();
</script>

<Seo
	title="Drafts"
	description="임시 저장 및 예약 글"
	canonical={`${data.siteUrl}/drafts`}
	noindex
/>
<h1>Drafts</h1>
<p><a href="/posts/new">New Post</a></p>
<table>
	<thead><tr><th>Title</th><th>Status</th><th>Updated</th></tr></thead>
	<tbody
		>{#each data.items as post}<tr
				><td><a href={`/posts/${post.id}/edit`}>{post.title}</a></td><td
					>{post.draft ? 'Draft' : 'Scheduled'}</td
				><td>{koreanDate(post.updatedAt)}</td></tr
			>{:else}<tr><td colspan="3">임시 저장 또는 예약된 글이 없습니다.</td></tr>{/each}</tbody
	>
</table>
