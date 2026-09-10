<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	let { data } = $props();
</script>

<Seo title="About" description="개발과 일상의 기록" canonical={`${data.siteUrl}/`} />
<article class="article-body">
	<h1>mayb-log</h1>
	<p>개발하며 배우고, 만들고, 생각한 것을 기록합니다.</p>
	<p><a href="/posts">글 목록 보기</a></p>
</article>
