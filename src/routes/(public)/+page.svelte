<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { data } = $props();
</script>

<Seo title={m.about_title()} description={m.about_description()} canonical={`${data.siteUrl}/`} />
<article class="article-body">
	<h1>mayb-log</h1>
	<p>{m.about_body()}</p>
	<p><a href="/posts">{m.view_posts()}</a></p>
</article>
