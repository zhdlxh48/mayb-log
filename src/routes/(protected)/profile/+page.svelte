<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	let { data, form } = $props();
	const profile = $derived(form?.profileForm ?? data.profileForm);
	const password = $derived(form?.passwordForm ?? data.passwordForm);
</script>

<Seo title="Profile" description="계정 정보" canonical={`${data.siteUrl}/profile`} noindex />
<h1>Profile</h1>
<dl>
	<dt>User ID</dt>
	<dd>{data.user.username}</dd>
	<dt>Email</dt>
	<dd>{data.user.email}</dd>
	<dt>Approval</dt>
	<dd>{data.user.approved ? 'Approved' : 'Pending'}</dd>
	<dt>Account</dt>
	<dd>{data.user.banned ? 'Suspended' : 'Active'}</dd>
</dl>

<h2>Profile</h2>
{#if form?.success}<p role="status">{form.success}</p>{/if}
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<form method="POST" action="?/profile" class="form-grid">
	<label for="name">Nickname</label>
	<div>
		<input id="name" name="name" value={profile.data.name} required />
		{#each profile.errors.name ?? [] as error}<small class="field-error">{error}</small>{/each}
	</div>
	<span></span><button type="submit">Save profile</button>
</form>

<h2>Password</h2>
<form method="POST" action="?/password" class="form-grid">
	<label for="currentPassword">Current password</label>
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
	<label for="newPassword">New password</label>
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
	<label for="passwordConfirmation">Confirmation</label>
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
	<span></span><button type="submit">Change password</button>
</form>

<form method="POST" action="?/logout"><button type="submit" class="secondary">Logout</button></form>
