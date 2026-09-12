<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import LocalDate from '$lib/components/LocalDate.svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { data } = $props();
	const canonical = $derived(`${data.siteUrl}/posts/${data.post.id}`);
	const image = $derived(
		data.image ? (data.siteUrl ? new URL(data.image, data.siteUrl).href : data.image) : null
	);
	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'BlogPosting',
			headline: data.post.title,
			description: data.post.description,
			datePublished: data.post.publishedAt?.toISOString(),
			dateModified: data.post.updatedAt.toISOString(),
			author: { '@type': 'Person', name: data.post.authorName },
			url: canonical,
			...(image ? { image } : {})
		})
	);
	const jsonLdScript = $derived(
		`<script type="application/ld+json">${jsonLd.replaceAll('<', '\\u003c')}</scr${'ipt'}>`
	);
</script>

<Seo
	title={data.post.title}
	description={data.post.description}
	{canonical}
	noindex={data.post.noindex}
	type="article"
	{image}
/>
<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- escaped JSON-LD from structured data -->
	{@html jsonLdScript}
</svelte:head>
<article>
	<header>
		<h1>{data.post.title}</h1>
		{#if data.post.subtitle}<p class="subtitle">{data.post.subtitle}</p>{/if}
		<p class="metadata">
			<LocalDate value={data.post.publishedAt} /> · {#if data.post.authorUsername}<a
					href={`/search?author=${encodeURIComponent(data.post.authorUsername)}`}
					>{data.post.authorName}</a
				>{:else}{data.post.authorName}{/if}
			{#if data.post.seriesTitle}
				· {data.post.seriesTitle}{/if}
			{#each data.post.categories as category}
				· {category}{/each}
			{#each data.post.tags as tag}
				· <a href={`/search?tag=${encodeURIComponent(tag)}`}>#{tag}</a>{/each}
		</p>
		{#if data.user}<p><a href={`/posts/${data.post.id}/edit`}>{m.edit()}</a></p>{/if}
	</header>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-rendered and sanitized Markdown -->
	<div class="article-body">{@html data.html}</div>
	{#if data.neighbors.previous || data.neighbors.next}
		<nav class="series-nav" aria-label={m.series_navigation()}>
			{#if data.neighbors.previous}<a href={`/posts/${data.neighbors.previous.id}`}
					>← {data.neighbors.previous.title}</a
				>{/if}
			{#if data.neighbors.next}<a href={`/posts/${data.neighbors.next.id}`}
					>{data.neighbors.next.title} →</a
				>{/if}
		</nav>
	{/if}
</article>

<style>
	.subtitle {
		color: var(--muted-color);
		font-size: 1.05rem;
	}
	.series-nav {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 2rem;
	}
</style>
