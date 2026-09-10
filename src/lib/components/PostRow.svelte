<script lang="ts">
	import LocalDate from '$lib/components/LocalDate.svelte';

	let { post } = $props<{
		post: {
			id: number;
			title: string;
			description: string;
			publishedAt: Date | null;
			authorName: string;
			authorUsername: string | null;
			seriesTitle: string | null;
			categories: string[];
			tags: string[];
		};
	}>();
</script>

<article class="post-row">
	<p class="date">
		<LocalDate value={post.publishedAt} />
	</p>
	<div>
		<h2><a href={`/posts/${post.id}`}>{post.title}</a></h2>
		<p>{post.description}</p>
		<p class="metadata">
			{#if post.authorUsername}<a href={`/search?author=${encodeURIComponent(post.authorUsername)}`}
					>{post.authorName}</a
				>{:else}{post.authorName}{/if}
			{#if post.seriesTitle}
				· {post.seriesTitle}{/if}
			{#each post.categories as category}
				· {category}{/each}
			{#each post.tags as tag}
				· <a href={`/search?tag=${encodeURIComponent(tag)}`}>#{tag}</a>{/each}
		</p>
	</div>
</article>

<style>
	.post-row {
		display: grid;
		grid-template-columns: 7.5rem minmax(0, 1fr);
		gap: 1rem;
		margin-block: 0 1.3rem;
	}
	.date {
		margin: 0.15rem 0 0;
		color: var(--muted-color);
		font-size: 0.86rem;
	}
	h2 {
		margin: 0 0 0.25rem;
		font-size: 1.08rem;
	}
	p {
		margin: 0.2rem 0;
	}
	@media (max-width: 640px) {
		.post-row {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
		}
	}
</style>
