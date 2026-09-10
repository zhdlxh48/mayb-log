<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import Turnstile from '$lib/components/Turnstile.svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { data, form } = $props();
	let showPassword = $state(false);
	const current = $derived(form?.form ?? data.form);
</script>

<Seo
	title={m.signup_title()}
	description={m.signup_description()}
	canonical={`${data.siteUrl}/signup`}
	noindex
/>
<h1>{m.signup_title()}</h1>
{#if form?.success}<p role="status">{form.success}</p>{/if}
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<form method="POST" class="form-grid">
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
	<label for="name">{m.nickname()}</label>
	<div>
		<input
			id="name"
			name="name"
			autocomplete="nickname"
			value={current.data.name}
			required
		/>{#each current.errors.name ?? [] as error}<small class="field-error">{error}</small>{/each}
	</div>
	<label for="email">{m.email()}</label>
	<div>
		<input
			id="email"
			type="email"
			name="email"
			autocomplete="email"
			value={current.data.email}
			required
		/>{#each current.errors.email ?? [] as error}<small class="field-error">{error}</small>{/each}
	</div>
	<label for="password">{m.password()}</label>
	<div>
		<input
			id="password"
			type={showPassword ? 'text' : 'password'}
			name="password"
			autocomplete="new-password"
			required
		/>{#each current.errors.password ?? [] as error}<small class="field-error">{error}</small
			>{/each}
	</div>
	<label for="passwordConfirmation">{m.password_confirmation()}</label>
	<div>
		<input
			id="passwordConfirmation"
			type={showPassword ? 'text' : 'password'}
			name="passwordConfirmation"
			autocomplete="new-password"
			required
		/>{#each current.errors.passwordConfirmation ?? [] as error}<small class="field-error"
				>{error}</small
			>{/each}
	</div>
	<span></span><label
		><input type="checkbox" bind:checked={showPassword} /> {m.show_password()}</label
	>
	<span>{m.robot_check()}</span><Turnstile siteKey={data.turnstileSiteKey} />
	<span></span><button type="submit">{m.signup_title()}</button>
</form>
<p><a href="/login" data-sveltekit-reload>{m.login_link()}</a></p>
