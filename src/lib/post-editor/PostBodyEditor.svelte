<script lang="ts">
	import { MAX_MARKDOWN_BYTES } from '$lib/limits';
	import * as m from '$lib/paraglide/messages.js';
	import ImageManager from './ImageManager.svelte';
	import type { EditorImage, MarkdownDiagnostic } from './types';

	let {
		bodyMarkdown,
		errors = [],
		assetId,
		initialImages = []
	} = $props<{
		bodyMarkdown: string;
		errors?: string[];
		assetId: string;
		initialImages?: EditorImage[];
	}>();

	function initialMarkdown() {
		return bodyMarkdown;
	}
	let markdown = $state(initialMarkdown());
	let textarea = $state<HTMLTextAreaElement>();
	let importError = $state('');
	let previewHtml = $state('');
	let previewDiagnostics = $state<MarkdownDiagnostic[]>([]);
	let lastPreviewSource = $state<string | null>(null);
	let previewLoading = $state(false);
	let previewError = $state('');
	let previewVisible = $state(false);
	let previewRequestId = 0;

	function isPreviewResult(
		value: unknown
	): value is { html: string; diagnostics: MarkdownDiagnostic[] } {
		return (
			typeof value === 'object' &&
			value !== null &&
			'html' in value &&
			typeof value.html === 'string' &&
			'diagnostics' in value &&
			Array.isArray(value.diagnostics)
		);
	}

	function insertImage(url: string) {
		if (!textarea) return;
		const text = `![${m.image_alt()}](${url})`;
		textarea.focus();
		textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
		markdown = textarea.value;
	}

	async function importMarkdown(file: File) {
		importError = '';
		if (file.size > MAX_MARKDOWN_BYTES) {
			importError = m.markdown_too_large();
			return;
		}
		if (markdown && !confirm(m.replace_markdown())) return;
		try {
			markdown = await file.text();
		} catch {
			importError = m.markdown_import_error();
		}
	}

	async function showPreview() {
		previewVisible = true;
		const source = markdown;
		const requestId = ++previewRequestId;
		previewError = '';
		if (source === lastPreviewSource) {
			previewLoading = false;
			return;
		}
		previewLoading = true;
		try {
			const response = await fetch('/api/markdown-preview', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ bodyMarkdown: source }),
				redirect: 'error'
			});
			if (response.status !== 200) throw new Error();
			const result: unknown = await response.json();
			if (!isPreviewResult(result)) throw new Error();
			if (requestId !== previewRequestId) return;
			previewHtml = result.html;
			previewDiagnostics = result.diagnostics;
			lastPreviewSource = source;
		} catch {
			if (requestId !== previewRequestId) return;
			previewError = m.preview_error();
		} finally {
			if (requestId === previewRequestId) previewLoading = false;
		}
	}
</script>

<div class="editor-heading">
	<label for="bodyMarkdown"><strong>{m.body()}</strong></label>
	<div class="editor-tools">
		<button type="button" aria-pressed={!previewVisible} onclick={() => (previewVisible = false)}
			>{m.write()}</button
		>
		<button type="button" aria-pressed={previewVisible} onclick={showPreview}>{m.preview()}</button>
		<label class="file-action"
			>{m.import_markdown()}<input
				type="file"
				accept=".md,text/markdown,text/plain"
				onchange={(event) => {
					const file = event.currentTarget.files?.[0];
					event.currentTarget.value = '';
					if (file) void importMarkdown(file);
				}}
			/></label
		>
	</div>
</div>
<div class:hidden={!previewVisible} class="preview" aria-live="polite">
	{#if previewLoading}<p>{m.preview_loading()}</p>{:else if previewError}<p role="alert">
			{previewError}
		</p>{:else}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-rendered and sanitized Markdown -->
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
{#each errors as error}<small class="field-error">{error}</small>{/each}
{#if importError}<p role="alert">{importError}</p>{/if}

<ImageManager {assetId} {initialImages} onInsert={insertImage} />

<style>
	.editor-heading {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.editor-tools {
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
	.hidden {
		display: none;
	}
	@media (max-width: 640px) {
		.editor-tools {
			width: 100%;
		}
	}
</style>
