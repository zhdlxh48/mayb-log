<script lang="ts">
	import PostForm from '$lib/components/PostForm.svelte';
	import Seo from '$lib/components/Seo.svelte';
	let { data, form } = $props();
</script>

<Seo
	title={`Edit ${data.post.title}`}
	description="글 편집"
	canonical={`${data.siteUrl}/posts/${data.post.id}/edit`}
	noindex
/>
<h1>Edit Post</h1>
{#if data.saved}<p role="status">저장했습니다.</p>{/if}
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<PostForm
	form={form?.form ?? data.form}
	options={data.options}
	mode="edit"
	draft={data.post.draft}
/>
