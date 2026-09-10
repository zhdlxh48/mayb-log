<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	let { data } = $props();
</script>

<Seo title="Archive" description="연도와 월별 글 보관함" canonical={`${data.siteUrl}/archive`} />
<h1>Archive</h1>
{#each data.years as year}
	<details open>
		<summary>{year.year} ({year.count})</summary>
		<ul>
			{#each year.months as month}<li>
					<a href={month.href}>{Number(month.month)}월 ({month.count})</a>
				</li>{/each}
		</ul>
	</details>
{:else}<p>아직 공개된 글이 없습니다.</p>{/each}

<style>
	details {
		margin-block: 0.4rem;
		padding-block: 0.2rem;
	}
	ul {
		margin-block: 0.35rem;
	}
</style>
