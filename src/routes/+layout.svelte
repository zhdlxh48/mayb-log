<script lang="ts">
	import '@picocss/pico/css/pico.min.css';
	import '../app.css';
	import AppHeader from '$lib/components/AppHeader.svelte';

	let { data, children } = $props();
</script>

<svelte:head>
	<title>mayb-log</title>
	<meta name="description" content="개발과 일상의 기록" />
</svelte:head>

<AppHeader user={data.user} />
<main class="site-main">{@render children()}</main>
<footer class="site-footer">© {new Date().getFullYear()} mayb-log</footer>
