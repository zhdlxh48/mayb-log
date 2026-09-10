<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import TaxonomyForm from '$lib/components/TaxonomyForm.svelte';
	let { data, form } = $props();
</script>

<Seo
	title="New Series"
	description="시리즈 만들기"
	canonical={`${data.siteUrl}/series/new`}
	noindex
/>
<h1>New Series</h1>
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<TaxonomyForm
	kind="series"
	data={(form?.form ?? data.form).data}
	errors={(form?.form ?? data.form).errors}
/>
