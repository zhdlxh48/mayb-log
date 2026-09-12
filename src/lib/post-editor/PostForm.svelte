<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';
	import PostBodyEditor from './PostBodyEditor.svelte';
	import PostMetadataFields from './PostMetadataFields.svelte';
	import type { EditorImage, PostEditorForm, PostEditorOptions } from './types';

	let {
		form,
		options,
		mode,
		status = 'draft',
		assetId,
		initialImages = []
	} = $props<{
		form: PostEditorForm;
		options: PostEditorOptions;
		mode: 'new' | 'edit';
		status?: 'draft' | 'scheduled' | 'published';
		assetId: string;
		initialImages?: EditorImage[];
	}>();

	let allowLeave = false;

	beforeNavigate((navigation) => {
		if (allowLeave || navigation.willUnload) return;
		if (!confirm(m.leave_editor_confirm())) navigation.cancel();
	});

	onMount(() => {
		const warn = (event: BeforeUnloadEvent) => {
			if (allowLeave) return;
			event.preventDefault();
			event.returnValue = '';
		};
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	});

	function submit(event: SubmitEvent) {
		const action = (event.submitter as HTMLButtonElement | null)?.formAction ?? '';
		if (action.endsWith('/delete') && !confirm(m.delete_post_confirm())) {
			event.preventDefault();
			return;
		}
		allowLeave = true;
	}
</script>

<form method="POST" onsubmit={submit}>
	{#if mode === 'new'}<input type="hidden" name="assetId" value={assetId} />{/if}
	<PostMetadataFields {form} {options} />
	<PostBodyEditor
		bodyMarkdown={form.data.bodyMarkdown}
		errors={form.errors.bodyMarkdown}
		{assetId}
		{initialImages}
	/>

	<div class="actions">
		{#if mode === 'new' || status !== 'published'}
			<button type="submit" formaction="?/saveDraft">{m.save_draft()}</button>
			<button type="submit" formaction="?/publish">{m.publish()}</button>
		{:else}
			<button type="submit" formaction="?/save">{m.save_changes()}</button>
			<button type="submit" formaction="?/moveToDraft">{m.move_to_draft()}</button>
		{/if}
		{#if mode === 'edit'}<button type="submit" formaction="?/delete" formnovalidate
				>{m.delete()}</button
			>{/if}
	</div>
</form>

<style>
	form {
		max-width: 920px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 1rem;
	}
</style>
