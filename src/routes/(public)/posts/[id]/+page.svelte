<script lang="ts">
	import { koreanDate } from '$lib/dates';
	import Seo from '$lib/components/Seo.svelte';
	let { data } = $props();
	const canonical = $derived(`${data.siteUrl}/posts/${data.post.id}`);
	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'BlogPosting',
			headline: data.post.title,
			description: data.post.description,
			datePublished: data.post.publishedAt?.toISOString(),
			dateModified: data.post.updatedAt.toISOString(),
			author: { '@type': 'Person', name: data.post.authorName },
			url: canonical
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
/>
<svelte:head>
	{@html jsonLdScript}
</svelte:head>
<article>
	<header>
		<h1>{data.post.title}</h1>
		{#if data.post.subtitle}<p class="subtitle">{data.post.subtitle}</p>{/if}
		<p class="metadata">
			{koreanDate(data.post.publishedAt)} · {data.post.authorName}
			{#if data.post.seriesTitle}
				· {data.post.seriesTitle}{/if}
			{#each data.post.categories as category}
				· {category}{/each}
			{#each data.post.tags as tag}
				· <a href={`/search?tag=${encodeURIComponent(tag)}`}>#{tag}</a>{/each}
		</p>
		{#if data.user}<p><a href={`/posts/${data.post.id}/edit`}>Edit</a></p>{/if}
	</header>
	<div class="article-body">{@html data.html}</div>
	{#if data.neighbors.previous || data.neighbors.next}
		<nav class="series-nav" aria-label="시리즈 글 이동">
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
		color: var(--pico-muted-color);
		font-size: 1.05rem;
	}
	.series-nav {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 2rem;
	}
</style>
