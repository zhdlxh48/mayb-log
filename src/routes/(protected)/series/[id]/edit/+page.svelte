<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import TaxonomyForm from '$lib/components/TaxonomyForm.svelte';
	let { data, form } = $props();
</script>

<Seo
	title={`Edit ${data.item.title}`}
	description="시리즈 편집"
	canonical={`${data.siteUrl}/series/${data.item.id}/edit`}
	noindex
/>
<h1>Edit Series</h1>
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<TaxonomyForm
	kind="series"
	data={(form?.form ?? data.form).data}
	errors={(form?.form ?? data.form).errors}
	editing
/>
