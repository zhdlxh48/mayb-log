<script lang="ts">
	import PostForm from '$lib/components/PostForm.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { data, form } = $props();
</script>

<Seo
	title={`${m.edit()} ${data.post.title}`}
	description={m.edit_post_description()}
	canonical={`${data.siteUrl}/posts/${data.post.id}/edit`}
	noindex
/>
<h1>{m.edit_post_title()}</h1>
{#if data.saved}<p role="status">{m.saved()}</p>{/if}
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<PostForm
	form={form?.form ?? data.form}
	options={data.options}
	mode="edit"
	status={data.status}
	assetId={data.post.assetId}
	initialImages={data.images}
/>
