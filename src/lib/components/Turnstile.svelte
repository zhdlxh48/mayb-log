<script lang="ts">
	let { siteKey } = $props<{ siteKey: string }>();
</script>

<svelte:head>
	<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<div class="cf-turnstile" data-sitekey={siteKey} data-response-field-name="captcha"></div>
