<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	let { data } = $props();
	function monthName(month: string) {
		return new Intl.DateTimeFormat(getLocale(), { month: 'long', timeZone: 'Asia/Seoul' }).format(
			new Date(Date.UTC(2020, Number(month) - 1, 1))
		);
	}
</script>

<Seo
	title={m.archive_title()}
	description={m.archive_description()}
	canonical={`${data.siteUrl}/archive`}
/>
<h1>{m.archive_title()}</h1>
{#each data.years as year}
	<details open>
		<summary>{year.year} ({year.count})</summary>
		<ul>
			{#each year.months as month}<li>
					<a href={month.href}>{monthName(month.month)} ({month.count})</a>
				</li>{/each}
		</ul>
	</details>
{:else}<p>{m.empty_posts()}</p>{/each}

<style>
	details {
		margin-block: 0.4rem;
		padding-block: 0.2rem;
	}
	ul {
		margin-block: 0.35rem;
	}
</style>
