<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import TaxonomyForm from '$lib/components/TaxonomyForm.svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { data, form } = $props();
</script>

<Seo
	title={`${m.edit()} ${data.item.title}`}
	description={m.edit_series()}
	canonical={`${data.siteUrl}/series/${data.item.id}/edit`}
	noindex
/>
<h1>{m.edit_series()}</h1>
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<TaxonomyForm
	kind="series"
	data={(form?.form ?? data.form).data}
	errors={(form?.form ?? data.form).errors}
	editing
/>
