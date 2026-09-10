<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import TaxonomyForm from '$lib/components/TaxonomyForm.svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { data, form } = $props();
</script>

<Seo
	title={m.new_series()}
	description={m.new_series_description()}
	canonical={`${data.siteUrl}/series/new`}
	noindex
/>
<h1>{m.new_series()}</h1>
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<TaxonomyForm
	kind="series"
	data={(form?.form ?? data.form).data}
	errors={(form?.form ?? data.form).errors}
/>
