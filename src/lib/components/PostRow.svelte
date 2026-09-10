<script lang="ts">
	import { koreanDate } from '$lib/dates';

	let { post } = $props<{
		post: {
			id: number;
			title: string;
			description: string;
			publishedAt: Date | null;
			authorName: string;
			seriesTitle: string | null;
			categories: string[];
			tags: string[];
		};
	}>();
</script>

<article>
	<h2><a href={`/posts/${post.id}`}>{post.title}</a></h2>
	<p>{post.description}</p>
	<p class="metadata">
		{koreanDate(post.publishedAt)} · {post.authorName}
		{#if post.seriesTitle}
			· {post.seriesTitle}{/if}
		{#each post.categories as category}
			· {category}{/each}
		{#each post.tags as tag}
			· <a href={`/search?tag=${encodeURIComponent(tag)}`}>#{tag}</a>{/each}
	</p>
</article>

<style>
	article {
		padding-block: 0.75rem;
		border-bottom: 1px solid #dfe3e7;
	}
	h2 {
		margin: 0 0 0.25rem;
		font-size: 1.08rem;
	}
	p {
		margin: 0.2rem 0;
	}
</style>
