<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import TaxonomyForm from '$lib/components/TaxonomyForm.svelte';
	let { data, form } = $props();
</script>

<Seo
	title="New Category"
	description="카테고리 만들기"
	canonical={`${data.siteUrl}/categories/new`}
	noindex
/>
<h1>New Category</h1>
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<TaxonomyForm
	kind="category"
	data={(form?.form ?? data.form).data}
	errors={(form?.form ?? data.form).errors}
/>
