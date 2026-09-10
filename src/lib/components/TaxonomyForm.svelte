<script lang="ts">
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
	<label for={field}>{kind === 'series' ? 'Title' : 'Name'}</label>
	<div>
		<input
			id={field}
			name={field}
			value={data[field] ?? ''}
			required
		/>{#each errors[field] ?? [] as error}<small class="field-error">{error}</small>{/each}
	</div>
	<label for="description">Description</label><textarea id="description" name="description" rows="3"
		>{data.description}</textarea
	>
	<span></span><button type="submit">Save</button>
</form>

{#if editing}
	<form
		method="POST"
		action="?/delete"
		onsubmit={(event) => {
			if (!confirm('삭제하시겠습니까? 연결된 글은 유지됩니다.')) event.preventDefault();
		}}
	>
		<button type="submit" class="outline secondary">Delete</button>
	</form>
{/if}
