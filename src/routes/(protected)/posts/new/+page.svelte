<script lang="ts">
	import PostForm from '$lib/post-editor/PostForm.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { data, form } = $props();
	const assetId = $derived(form?.assetId ?? data.assetId);
	const images = $derived(form?.images ?? []);
</script>

<Seo
	title={m.new_post_title()}
	description={m.new_post_description()}
	canonical={`${data.siteUrl}/posts/new`}
	noindex
/>
<h1>{m.new_post_title()}</h1>
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<PostForm
	form={form?.form ?? data.form}
	options={data.options}
	mode="new"
	{assetId}
	initialImages={images}
/>
