<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · mayb-log</title></svelte:head>
<h1>{page.status}</h1>
<p>{page.error?.message ?? '페이지를 표시하지 못했습니다.'}</p>
<p><a href="/">홈으로 돌아가기</a></p>
