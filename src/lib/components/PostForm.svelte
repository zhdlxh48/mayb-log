<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import imageCompression from 'browser-image-compression';
	import * as m from '$lib/paraglide/messages.js';

	type Form = {
		data: {
			title: string;
			subtitle: string;
			description: string;
			bodyMarkdown: string;
			seriesId: number | null;
			seriesPosition: number | null;
			categories: number[];
			tags: string;
			publishedAt: string;
			noindex: boolean;
		};
		errors: {
			title?: string[];
			description?: string[];
			bodyMarkdown?: string[];
			seriesPosition?: string[];
			tags?: string[];
			publishedAt?: string[];
		};
	};

	type Image = { id: string; url: string };

	let {
		form,
		options,
		mode,
		status = 'draft',
		assetId,
		initialImages = []
	} = $props<{
		form: Form;
		options: {
			series: { id: number; title: string }[];
			categories: { id: number; name: string }[];
		};
		mode: 'new' | 'edit';
		status?: 'draft' | 'scheduled' | 'published';
		assetId: string;
		initialImages?: Image[];
	}>();

	function initialMarkdown() {
		return form.data.bodyMarkdown;
	}
	function initialFields() {
		return {
			title: form.data.title,
			subtitle: form.data.subtitle,
			description: form.data.description,
			seriesId: form.data.seriesId ?? '',
			seriesPosition: form.data.seriesPosition ?? '',
			categories: [...form.data.categories],
			tags: form.data.tags,
			publishedAt: form.data.publishedAt,
			noindex: form.data.noindex
		};
	}
	function loadedImages() {
		return [...initialImages];
	}
	let markdown = $state(initialMarkdown());
	const initial = initialFields();
	let title = $state(initial.title);
	let subtitle = $state(initial.subtitle);
	let description = $state(initial.description);
	let seriesId = $state<number | ''>(initial.seriesId);
	let seriesPosition = $state<number | ''>(initial.seriesPosition);
	let selectedCategories = $state(initial.categories);
	let tags = $state(initial.tags);
	let publishedAt = $state(initial.publishedAt);
	let noindex = $state(initial.noindex);
	let textarea = $state<HTMLTextAreaElement>();
	let images = $state<Image[]>(loadedImages());
	let mediaError = $state('');
	let previewHtml = $state('');
	let lastPreviewSource = $state<string | null>(null);
	let previewLoading = $state(false);
	let previewError = $state('');
	let previewVisible = $state(false);
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

	function insert(url: string) {
		const text = `![${m.image_alt()}](${url})`;
		if (!textarea) return;
		textarea.focus();
		textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
		markdown = textarea.value;
	}

	async function upload(file: File) {
		mediaError = '';
		try {
			const compressed = await imageCompression(file, {
				maxSizeMB: 4,
				maxWidthOrHeight: 1600,
				initialQuality: 0.82,
				fileType: 'image/webp',
				useWebWorker: true
			});
			const body = new FormData();
			body.set('file', compressed, 'image.webp');
			const response = await fetch(`/api/media/${assetId}`, { method: 'POST', body });
			if (!response.ok) throw new Error(m.image_upload_error());
			const image: Image = await response.json();
			images = [...images, image];
			insert(image.url);
		} catch (error) {
			mediaError = error instanceof Error ? error.message : m.image_upload_error();
		}
	}

	async function remove(image: Image) {
		if (!confirm(m.image_delete_warning())) return;
		const response = await fetch(`/api/media/${assetId}/${image.id}`, { method: 'DELETE' });
		if (!response.ok) {
			mediaError = m.image_delete_error();
			return;
		}
		images = images.filter(({ id }) => id !== image.id);
	}

	async function importMarkdown(file: File) {
		if (markdown && !confirm(m.replace_markdown())) return;
		markdown = await file.text();
	}

	async function showPreview() {
		previewVisible = true;
		previewError = '';
		if (markdown === lastPreviewSource) return;
		previewLoading = true;
		try {
			const response = await fetch('/api/markdown-preview', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ bodyMarkdown: markdown })
			});
			if (!response.ok) throw new Error(m.preview_error());
			previewHtml = ((await response.json()) as { html: string }).html;
			lastPreviewSource = markdown;
		} catch (error) {
			previewError = error instanceof Error ? error.message : m.preview_error();
		} finally {
			previewLoading = false;
		}
	}

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
	<div class="form-grid">
		<label for="title">{m.title()}</label>
		<div>
			<input id="title" name="title" bind:value={title} required />
			{#each form.errors.title ?? [] as error}<small class="field-error">{error}</small>{/each}
		</div>
		<label for="subtitle">{m.subtitle()}</label><input
			id="subtitle"
			name="subtitle"
			bind:value={subtitle}
		/>
		<label for="description">{m.description()}</label>
		<div>
			<textarea id="description" name="description" rows="2" bind:value={description} required
			></textarea>
			{#each form.errors.description ?? [] as error}<small class="field-error">{error}</small
				>{/each}
		</div>
		<label for="seriesId">{m.series_title()}</label><select
			id="seriesId"
			name="seriesId"
			bind:value={seriesId}
		>
			<option value="">{m.none()}</option>
			{#each options.series as item}<option value={item.id}>{item.title}</option>{/each}
		</select>
		<label for="seriesPosition">{m.series_position()}</label>
		<div>
			<input
				id="seriesPosition"
				type="number"
				min="1"
				name="seriesPosition"
				bind:value={seriesPosition}
			/>
			{#each form.errors.seriesPosition ?? [] as error}<small class="field-error">{error}</small
				>{/each}
		</div>
		<span>{m.categories_title()}</span>
		<fieldset>
			{#each options.categories as item}<label
					><input
						type="checkbox"
						name="categories"
						value={item.id}
						bind:group={selectedCategories}
					/>
					{item.name}</label
				>{/each}
		</fieldset>
		<label for="tags">{m.tags()}</label>
		<div>
			<input id="tags" name="tags" bind:value={tags} placeholder="tag-1, tag-2" />
			{#each form.errors.tags ?? [] as error}<small class="field-error">{error}</small>{/each}
		</div>
		<label for="publishedAt">{m.publish_at()}</label>
		<div>
			<input id="publishedAt" type="datetime-local" name="publishedAt" bind:value={publishedAt} />
			{#each form.errors.publishedAt ?? [] as error}<small class="field-error">{error}</small
				>{/each}
		</div>
		<label for="noindex">{m.no_index()}</label><label
			><input id="noindex" type="checkbox" name="noindex" bind:checked={noindex} />
			{m.no_index_help()}</label
		>
	</div>

	<div class="editor-heading">
		<label for="bodyMarkdown"><strong>{m.body()}</strong></label>
		<div class="editor-tools">
			<button type="button" aria-pressed={!previewVisible} onclick={() => (previewVisible = false)}
				>{m.write()}</button
			>
			<button type="button" aria-pressed={previewVisible} onclick={showPreview}
				>{m.preview()}</button
			>
			<label class="file-action"
				>{m.import_markdown()}<input
					type="file"
					accept=".md,text/markdown,text/plain"
					onchange={(event) => {
						const file = event.currentTarget.files?.[0];
						if (file) void importMarkdown(file);
						event.currentTarget.value = '';
					}}
				/></label
			>
			<label class="file-action"
				>{m.upload_image()}<input
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onchange={(event) => {
						const file = event.currentTarget.files?.[0];
						if (file) void upload(file);
						event.currentTarget.value = '';
					}}
				/></label
			>
		</div>
	</div>
	<div class:hidden={!previewVisible} class="preview article-body" aria-live="polite">
		{#if previewLoading}<p>{m.preview_loading()}</p>{:else if previewError}<p role="alert">
				{previewError}
			</p>{:else}{@html previewHtml}{/if}
	</div>
	<textarea
		class:hidden={previewVisible}
		class="markdown"
		id="bodyMarkdown"
		name="bodyMarkdown"
		bind:this={textarea}
		bind:value={markdown}
		required
		spellcheck="true"></textarea>
	{#each form.errors.bodyMarkdown ?? [] as error}<small class="field-error">{error}</small>{/each}
	{#if mediaError}<p role="alert">{mediaError}</p>{/if}

	{#if images.length}
		<table class="images">
			<caption>{m.images()}</caption>
			<tbody
				>{#each images as image}<tr
						><td><img src={image.url} alt="" /></td><td><a href={image.url}>{image.url}</a></td><td
							><button type="button" onclick={() => insert(image.url)}>{m.insert()}</button>
							<button type="button" onclick={() => remove(image)}>{m.delete()}</button></td
						></tr
					>{/each}</tbody
			>
		</table>
	{/if}

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
	fieldset {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1rem;
		margin: 0;
		padding: 0.45rem 0;
		border: 0;
	}
	fieldset label {
		white-space: nowrap;
	}
	.editor-heading {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.editor-tools,
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.file-action {
		padding: 0.3rem 0.7rem;
		border: 1px solid #999;
		border-radius: 2px;
		background: #f3f3f3;
		cursor: pointer;
	}
	.file-action input {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.markdown,
	.preview {
		min-height: clamp(24rem, 58vh, 38rem);
		margin-block: 0.5rem 0.8rem;
	}
	.markdown {
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		line-height: 1.55;
	}
	.preview {
		padding: 0.5rem;
		border: 1px solid var(--line-color);
		overflow: auto;
	}
	.images img {
		width: 72px;
		height: 52px;
		object-fit: cover;
	}
	.images td:nth-child(2) {
		overflow-wrap: anywhere;
	}
	.images button {
		padding: 0.15rem 0.4rem;
		font-size: 0.82rem;
	}
	.actions {
		margin-top: 1rem;
	}
	.hidden {
		display: none;
	}
	@media (max-width: 640px) {
		.editor-tools {
			width: 100%;
		}
		.images td:nth-child(2) {
			display: none;
		}
	}
</style>
