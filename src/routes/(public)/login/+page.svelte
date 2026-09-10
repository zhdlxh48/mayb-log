<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import Turnstile from '$lib/components/Turnstile.svelte';
	let { data, form } = $props();
	const current = $derived(form?.form ?? data.form);
</script>

<Seo title="Login" description="mayb-log 로그인" canonical={`${data.siteUrl}/login`} noindex />
<h1>Login</h1>
{#if form && 'error' in form && form.error}<p role="alert">{form.error}</p>{/if}
<form method="POST" class="form-grid">
	<input type="hidden" name="next" value={current.data.next} />
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
	<label for="password">Password</label>
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
	<span>Robot check</span><Turnstile siteKey={data.turnstileSiteKey} />
	<span></span><button type="submit">Login</button>
</form>
<p><a href="/signup">Sign up</a></p>
