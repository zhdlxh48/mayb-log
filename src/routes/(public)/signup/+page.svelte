<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import Turnstile from '$lib/components/Turnstile.svelte';
	let { data, form } = $props();
	let showPassword = $state(false);
	const current = $derived(form?.form ?? data.form);
</script>

<Seo title="Sign up" description="mayb-log 회원가입" canonical={`${data.siteUrl}/signup`} noindex />
<h1>Sign up</h1>
{#if form?.success}<p role="status">{form.success}</p>{/if}
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<form method="POST" class="form-grid">
	<label for="username">User ID</label>
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
	<label for="name">Nickname</label>
	<div>
		<input
			id="name"
			name="name"
			autocomplete="nickname"
			value={current.data.name}
			required
		/>{#each current.errors.name ?? [] as error}<small class="field-error">{error}</small>{/each}
	</div>
	<label for="email">Email</label>
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
	<label for="password">Password</label>
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
	<label for="passwordConfirmation">Password confirmation</label>
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
	<span></span><label><input type="checkbox" bind:checked={showPassword} /> 비밀번호 표시</label>
	<span>Robot check</span><Turnstile siteKey={data.turnstileSiteKey} />
	<span></span><button type="submit">Sign up</button>
</form>
<p><a href="/login">이미 계정이 있습니다.</a></p>
