<script lang="ts">
	let {
		title,
		description,
		canonical,
		noindex = false,
		type = 'website'
	} = $props<{
		title: string;
		description: string;
		canonical: string;
		noindex?: boolean;
		type?: 'website' | 'article';
	}>();
</script>

<svelte:head>
	<title>{title} · mayb-log</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content="mayb-log" />
	<meta property="og:locale" content="ko_KR" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if noindex}<meta name="robots" content="noindex,follow" />{/if}
</svelte:head>
