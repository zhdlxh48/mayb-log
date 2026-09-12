<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	let {
		kind,
		data,
		errors = {},
		editing = false
	} = $props<{
		kind: 'series' | 'category';
		data: { title?: string; name?: string; description: string };
		errors?: { title?: string[]; name?: string[]; description?: string[] };
		editing?: boolean;
	}>();
	const field = $derived(kind === 'series' ? 'title' : 'name');
</script>

<form method="POST" action={editing ? '?/save' : undefined} class="form-grid">
	<label for={field}>{kind === 'series' ? m.title() : m.name()}</label>
	<div>
		<input
			id={field}
			name={field}
			value={data[field] ?? ''}
			required
		/>{#each errors[field] ?? [] as error}<small class="field-error">{error}</small>{/each}
	</div>
	<label for="description">{m.description()}</label><textarea
		id="description"
		name="description"
		rows="3">{data.description}</textarea
	>
	<span></span><button type="submit">{m.save()}</button>
</form>

{#if editing}
	<form
		method="POST"
		action="?/delete"
		onsubmit={(event) => {
			if (!confirm(m.delete_taxonomy_confirm())) event.preventDefault();
		}}
	>
		<button type="submit">{m.delete()}</button>
	</form>
{/if}
