<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import TaxonomyForm from '$lib/components/TaxonomyForm.svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { data, form } = $props();
</script>

<Seo
	title={m.new_category()}
	description={m.new_category_description()}
	canonical={`${data.siteUrl}/categories/new`}
	noindex
/>
<h1>{m.new_category()}</h1>
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<TaxonomyForm
	kind="category"
	data={(form?.form ?? data.form).data}
	errors={(form?.form ?? data.form).errors}
/>
