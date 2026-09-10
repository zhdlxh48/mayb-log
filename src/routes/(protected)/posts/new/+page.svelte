<script lang="ts">
	import PostForm from '$lib/components/PostForm.svelte';
	import Seo from '$lib/components/Seo.svelte';
	let { data, form } = $props();
</script>

<Seo title="New Post" description="새 글 작성" canonical={`${data.siteUrl}/posts/new`} noindex />
<h1>New Post</h1>
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<PostForm form={form?.form ?? data.form} options={data.options} mode="new" />
