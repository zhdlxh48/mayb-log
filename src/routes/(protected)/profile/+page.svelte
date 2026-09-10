<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { data, form } = $props();
	const profile = $derived(form?.profileForm ?? data.profileForm);
	const password = $derived(form?.passwordForm ?? data.passwordForm);
</script>

<Seo
	title={m.profile_title()}
	description={m.profile_description()}
	canonical={`${data.siteUrl}/profile`}
	noindex
/>
<h1>{m.profile_title()}</h1>
<dl>
	<dt>{m.user_id()}</dt>
	<dd>{data.user.username}</dd>
	<dt>{m.email()}</dt>
	<dd>{data.user.email}</dd>
	<dt>{m.approval()}</dt>
	<dd>{data.user.approved ? m.approved() : m.pending()}</dd>
</dl>

<h2>{m.profile_title()}</h2>
{#if form?.success}<p role="status">{form.success}</p>{/if}
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<form method="POST" action="?/profile" class="form-grid">
	<label for="name">{m.nickname()}</label>
	<div>
		<input id="name" name="name" autocomplete="nickname" value={profile.data.name} required />
		{#each profile.errors.name ?? [] as error}<small class="field-error">{error}</small>{/each}
	</div>
	<span></span><button type="submit">{m.save_profile()}</button>
</form>

<h2>{m.password()}</h2>
<form method="POST" action="?/password" class="form-grid">
	<label for="currentPassword">{m.current_password()}</label>
	<div>
		<input
			id="currentPassword"
			type="password"
			name="currentPassword"
			autocomplete="current-password"
			required
		/>
		{#each password.errors.currentPassword ?? [] as error}<small class="field-error">{error}</small
			>{/each}
	</div>
	<label for="newPassword">{m.new_password()}</label>
	<div>
		<input
			id="newPassword"
			type="password"
			name="newPassword"
			autocomplete="new-password"
			required
		/>
		{#each password.errors.newPassword ?? [] as error}<small class="field-error">{error}</small
			>{/each}
	</div>
	<label for="passwordConfirmation">{m.confirmation()}</label>
	<div>
		<input
			id="passwordConfirmation"
			type="password"
			name="passwordConfirmation"
			autocomplete="new-password"
			required
		/>
		{#each password.errors.passwordConfirmation ?? [] as error}<small class="field-error"
				>{error}</small
			>{/each}
	</div>
	<span></span><button type="submit">{m.change_password()}</button>
</form>

<form method="POST" action="?/logout">
	<button type="submit" class="secondary">{m.logout()}</button>
</form>
