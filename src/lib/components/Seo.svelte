<script lang="ts">
	let {
		title,
		description,
		canonical,
		noindex = false,
		type = 'website',
		image
	} = $props<{
		title: string;
		description: string;
		canonical: string;
		noindex?: boolean;
		type?: 'website' | 'article';
		image?: string | null;
	}>();
</script>

<svelte:head>
	<title>{title} · mayb-log</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content="mayb-log" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if image}<meta property="og:image" content={image} /><meta
			name="twitter:image"
			content={image}
		/>{/if}
	{#if noindex}<meta name="robots" content="noindex,follow" />{/if}
</svelte:head>
