<script lang="ts">
	import LocalDate from '$lib/components/LocalDate.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import Seo from '$lib/components/Seo.svelte';
	let { data } = $props();
</script>

<Seo
	title={m.drafts_title()}
	description={m.drafts_description()}
	canonical={`${data.siteUrl}/drafts`}
	noindex
/>
<h1>{m.drafts_title()}</h1>
<p><a href="/posts/new">{m.new_post()}</a></p>
<table>
	<thead><tr><th>{m.title()}</th><th>{m.status()}</th><th>{m.updated()}</th></tr></thead>
	<tbody
		>{#each data.items as post}<tr
				><td><a href={`/posts/${post.id}/edit`}>{post.title}</a></td><td
					>{post.publishedAt ? m.scheduled() : m.draft()}</td
				><td><LocalDate value={post.updatedAt} /></td></tr
			>{:else}<tr><td colspan="3">{m.empty_drafts()}</td></tr>{/each}</tbody
	>
</table>
