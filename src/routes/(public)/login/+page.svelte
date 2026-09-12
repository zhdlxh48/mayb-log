<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import Turnstile from '$lib/components/Turnstile.svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { data, form } = $props();
	const current = $derived(form?.form ?? data.form);
</script>

<Seo
	title={m.login_title()}
	description={m.login_description()}
	canonical={`${data.siteUrl}/login`}
	noindex
/>
<h1>{m.login_title()}</h1>
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<form method="POST" class="form-grid">
	<input type="hidden" name="next" value={current.data.next} />
	<label for="username">{m.user_id()}</label>
	<div>
		<input
			id="username"
			name="username"
			autocomplete="username"
			value={current.data.username}
			required
		/>{#each current.errors.username ?? [] as error}<small class="field-error">{error}</small
			>{/each}
	</div>
	<label for="password">{m.password()}</label>
	<div>
		<input
			id="password"
			type="password"
			name="password"
			autocomplete="current-password"
			required
		/>{#each current.errors.password ?? [] as error}<small class="field-error">{error}</small
			>{/each}
	</div>
	<span>{m.robot_check()}</span>
	<div class="captcha-field">
		<Turnstile siteKey={data.turnstileSiteKey} />
		{#each current.errors.captcha ?? [] as error}<small class="field-error">{error}</small>{/each}
	</div>
	<span></span><button type="submit">{m.login_title()}</button>
</form>
<p><a href="/signup" data-sveltekit-reload>{m.signup_link()}</a></p>
