<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import imageCompression from 'browser-image-compression';
	import { MAX_MARKDOWN_BYTES } from '$lib/limits';
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
			categories?: { _errors?: string[] };
			publishedAt?: string[];
		};
	};

	type Image = { id: string; url: string };
	type MarkdownDiagnostic = {
		line?: number;
		column?: number;
		message: string;
		code?: string;
	};

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
	function loadedImages() {
		return [...initialImages];
	}
	let markdown = $state(initialMarkdown());
	let textarea = $state<HTMLTextAreaElement>();
	let images = $state<Image[]>(loadedImages());
	let selectedImageIds = $state<string[]>([]);
	let mediaError = $state('');
	let importError = $state('');
	let previewHtml = $state('');
	let previewDiagnostics = $state<MarkdownDiagnostic[]>([]);
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
				useWebWorker: false
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

	function selectImage(imageId: string, selected: boolean) {
		selectedImageIds = selected
			? [...selectedImageIds, imageId]
			: selectedImageIds.filter((id) => id !== imageId);
	}

	async function removeSelected() {
		if (!selectedImageIds.length || !confirm(m.delete_selected_images_confirm())) return;
		mediaError = '';
		const imageIds = [...selectedImageIds];
		const response = await fetch(`/api/media/${assetId}`, {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ imageIds })
		});
		if (!response.ok) {
			mediaError = m.image_delete_error();
			return;
		}
		const removed = new Set(imageIds);
		images = images.filter(({ id }) => !removed.has(id));
		selectedImageIds = [];
	}

	async function importMarkdown(file: File) {
		importError = '';
		if (file.size > MAX_MARKDOWN_BYTES) {
			importError = m.markdown_too_large();
			return;
		}
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
			const result = (await response.json()) as {
				html: string;
				diagnostics: MarkdownDiagnostic[];
			};
			previewHtml = result.html;
			previewDiagnostics = result.diagnostics;
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
			<input id="title" name="title" defaultValue={form.data.title} required />
			{#each form.errors.title ?? [] as error}<small class="field-error">{error}</small>{/each}
		</div>
		<label for="subtitle">{m.subtitle()}</label><input
			id="subtitle"
			name="subtitle"
			defaultValue={form.data.subtitle}
		/>
		<label for="description">{m.description()}</label>
		<div>
			<textarea
				id="description"
				name="description"
				rows="2"
				defaultValue={form.data.description}
				required></textarea>
			{#each form.errors.description ?? [] as error}<small class="field-error">{error}</small
				>{/each}
		</div>
		<label for="seriesId">{m.series_title()}</label><select id="seriesId" name="seriesId">
			<option value="" selected={form.data.seriesId === null}>{m.none()}</option>
			{#each options.series as item}<option
					value={item.id}
					selected={form.data.seriesId === item.id}>{item.title}</option
				>{/each}
		</select>
		<label for="seriesPosition">{m.series_position()}</label>
		<div>
			<input
				id="seriesPosition"
				type="number"
				min="1"
				name="seriesPosition"
				defaultValue={form.data.seriesPosition ?? ''}
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
						defaultChecked={form.data.categories.includes(item.id)}
					/>
					{item.name}</label
				>{/each}
		</fieldset>
		{#each form.errors.categories?._errors ?? [] as error}<small class="field-error">{error}</small
			>{/each}
		<label for="tags">{m.tags()}</label>
		<div>
			<input id="tags" name="tags" defaultValue={form.data.tags} placeholder="tag-1, tag-2" />
			{#each form.errors.tags ?? [] as error}<small class="field-error">{error}</small>{/each}
		</div>
		<label for="publishedAt">{m.publish_at()}</label>
		<div>
			<input
				id="publishedAt"
				type="datetime-local"
				name="publishedAt"
				defaultValue={form.data.publishedAt}
			/>
			{#each form.errors.publishedAt ?? [] as error}<small class="field-error">{error}</small
				>{/each}
		</div>
		<label for="noindex">{m.no_index()}</label><label
			><input id="noindex" type="checkbox" name="noindex" defaultChecked={form.data.noindex} />
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
	<div class:hidden={!previewVisible} class="preview" aria-live="polite">
		{#if previewLoading}<p>{m.preview_loading()}</p>{:else if previewError}<p role="alert">
				{previewError}
			</p>{:else}
			<div class="article-body">{@html previewHtml}</div>
			{#if previewDiagnostics.length}
				<section class="preview-warnings" aria-labelledby="preview-warnings-heading">
					<h2 id="preview-warnings-heading">
						{m.preview_warnings()} ({previewDiagnostics.length})
					</h2>
					<ul>
						{#each previewDiagnostics as diagnostic}
							<li>
								{#if diagnostic.line}{diagnostic.line}:{diagnostic.column ?? 1}
								{/if}{diagnostic.message}
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/if}
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
	{#if importError}<p role="alert">{importError}</p>{/if}
	{#if mediaError}<p role="alert">{mediaError}</p>{/if}

	{#if images.length}
		<section class="images" aria-labelledby="images-heading">
			<h2 id="images-heading">{m.images()}</h2>
			<ul class="image-grid">
				{#each images as image}
					<li class="image-item" data-image-id={image.id}>
						<input
							type="checkbox"
							checked={selectedImageIds.includes(image.id)}
							aria-label={`${m.select_image()} ${image.id.slice(0, 8)}`}
							onchange={(event) => selectImage(image.id, event.currentTarget.checked)}
						/>
						<img src={image.url} alt="" />
						<button
							type="button"
							aria-label={`${m.insert()} ${image.id.slice(0, 8)}`}
							onclick={() => insert(image.url)}>{m.insert()}</button
						>
					</li>
				{/each}
			</ul>
			<button type="button" disabled={!selectedImageIds.length} onclick={removeSelected}
				>{m.delete_selected_images()} ({selectedImageIds.length})</button
			>
		</section>
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
	.preview-warnings {
		margin-top: 1.25rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--line-color);
	}
	.preview-warnings h2 {
		font-size: 1rem;
	}
	.preview-warnings ul {
		margin-bottom: 0;
	}
	.images {
		margin-top: 1rem;
	}
	.images h2 {
		font-size: 1rem;
	}
	.image-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: 0.65rem;
		margin: 0 0 0.65rem;
		padding: 0;
		list-style: none;
	}
	.image-item {
		display: grid;
		gap: 0.4rem;
		padding: 0.45rem;
		border: 1px solid var(--line-color);
	}
	.image-item input {
		justify-self: start;
	}
	.image-item img {
		width: 100%;
		height: 100px;
		object-fit: contain;
	}
	.image-item button {
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
	}
</style>
