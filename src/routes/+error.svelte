<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{page.status} · mayb-log</title>
	<meta name="description" content={m.error_description()} />
	<meta name="robots" content="noindex,follow" />
</svelte:head>
<h1>{page.status}</h1>
<p>{page.error?.message ?? m.error_description()}</p>
<p><a href="/">{m.home_link()}</a></p>
