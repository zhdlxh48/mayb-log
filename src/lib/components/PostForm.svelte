<script lang="ts">
	import { Carta, MarkdownEditor } from 'carta-md';
	import { attachment } from '@cartamd/plugin-attachment';
	import imageCompression from 'browser-image-compression';
	import 'carta-md/default.css';
	import '@cartamd/plugin-attachment/default.css';

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

	let {
		form,
		options,
		mode,
		draft = true
	} = $props<{
		form: Form;
		options: {
			series: { id: number; title: string }[];
			categories: { id: number; name: string }[];
		};
		mode: 'new' | 'edit';
		draft?: boolean;
	}>();

	function initialMarkdown() {
		return form.data.bodyMarkdown;
	}

	let markdown = $state<string>(initialMarkdown());
	let mediaError = $state('');

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
			const response = await fetch('/api/media', { method: 'POST', body });
			if (!response.ok) throw new Error('이미지를 업로드하지 못했습니다.');
			const result: { url: string } = await response.json();
			return result.url;
		} catch (error) {
			mediaError = error instanceof Error ? error.message : '이미지를 업로드하지 못했습니다.';
			return null;
		}
	}

	const carta = new Carta({
		sanitizer: false,
		extensions: [
			attachment({ upload, supportedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] })
		]
	});

	let attachedMedia = $derived<string[]>([
		...new Set(markdown.match(/\/media\/[0-9a-f-]{36}\.webp/gi) ?? [])
	]);

	async function removeMedia(url: string) {
		if (!confirm('R2에서 이 이미지를 삭제하시겠습니까? Markdown 내용은 바뀌지 않습니다.')) return;
		const id = url.slice('/media/'.length, -'.webp'.length);
		const response = await fetch(`/api/media/${id}`, { method: 'DELETE' });
		if (!response.ok) mediaError = '이미지를 삭제하지 못했습니다.';
	}
</script>

<form method="POST">
	<div class="form-grid">
		<label for="title">Title</label>
		<div>
			<input
				id="title"
				name="title"
				value={form.data.title}
				required
			/>{#each form.errors.title ?? [] as error}<small class="field-error">{error}</small>{/each}
		</div>
		<label for="subtitle">Subtitle</label><input
			id="subtitle"
			name="subtitle"
			value={form.data.subtitle}
		/>
		<label for="description">Description</label>
		<div>
			<textarea id="description" name="description" rows="2" required
				>{form.data.description}</textarea
			>
			{#each form.errors.description ?? [] as error}<small class="field-error">{error}</small
				>{/each}
		</div>
		<label for="seriesId">Series</label><select id="seriesId" name="seriesId"
			><option value="">None</option>{#each options.series as item}<option
					value={item.id}
					selected={form.data.seriesId === item.id}>{item.title}</option
				>{/each}</select
		>
		<label for="seriesPosition">Series position</label>
		<div>
			<input
				id="seriesPosition"
				type="number"
				min="1"
				name="seriesPosition"
				value={form.data.seriesPosition ?? ''}
			/>
			{#each form.errors.seriesPosition ?? [] as error}<small class="field-error">{error}</small
				>{/each}
		</div>
		<span>Categories</span>
		<fieldset>
			{#each options.categories as item}<label
					><input
						type="checkbox"
						name="categories"
						value={item.id}
						checked={form.data.categories.includes(item.id)}
					/>
					{item.name}</label
				>{/each}
		</fieldset>
		<label for="tags">Tags</label>
		<div>
			<input id="tags" name="tags" value={form.data.tags} placeholder="쉼표로 구분" />
			{#each form.errors.tags ?? [] as error}<small class="field-error">{error}</small>{/each}
		</div>
		<label for="publishedAt">Publish at</label>
		<div>
			<input
				id="publishedAt"
				type="datetime-local"
				name="publishedAt"
				value={form.data.publishedAt}
			/>
			{#each form.errors.publishedAt ?? [] as error}<small class="field-error">{error}</small
				>{/each}
		</div>
		<label for="noindex">No index</label><label
			><input id="noindex" type="checkbox" name="noindex" checked={form.data.noindex} /> 검색엔진 색인
			제외</label
		>
	</div>

	<label for="bodyMarkdown">Body</label>
	<input type="hidden" name="bodyMarkdown" value={markdown} />
	<div class="post-editor"><MarkdownEditor bind:value={markdown} {carta} /></div>
	{#each form.errors.bodyMarkdown ?? [] as error}<small class="field-error">{error}</small>{/each}
	{#if mediaError}<p role="alert">{mediaError}</p>{/if}

	{#if attachedMedia.length}
		<details>
			<summary>Attached media ({attachedMedia.length})</summary>
			<ul>
				{#each attachedMedia as media}<li>
						<a href={media}>{media}</a>
						<button type="button" class="outline secondary" onclick={() => removeMedia(media)}
							>Delete object</button
						>
					</li>{/each}
			</ul>
		</details>
	{/if}

	<div class="actions">
		{#if mode === 'new' || draft}
			<button type="submit" formaction="?/saveDraft" class="secondary">Save draft</button>
			<button type="submit" formaction="?/publish">Publish</button>
		{:else}
			<button type="submit" formaction="?/save">Save changes</button>
			<button type="submit" formaction="?/moveToDraft" class="secondary">Move to draft</button>
		{/if}
		{#if mode === 'edit'}
			<button
				type="submit"
				formaction="?/delete"
				formnovalidate
				class="outline secondary"
				onclick={(event) => {
					if (!confirm('이 글을 삭제하시겠습니까?')) event.preventDefault();
				}}>Delete</button
			>
		{/if}
	</div>
</form>

<style>
	form {
		max-width: 920px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
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
		margin: 0;
		white-space: nowrap;
	}
	.post-editor {
		margin-block: 0.5rem 0.8rem;
		min-width: 0;
	}
	:global(.post-editor .carta-editor) {
		min-height: 0;
		overflow: hidden;
		border: 1px solid #c8cfd6;
		border-radius: 0.2rem;
	}
	:global(.post-editor .carta-theme__default .carta-toolbar) {
		height: 2.5rem;
		padding: 0.25rem 0.5rem;
	}
	:global(.post-editor .carta-theme__default .carta-toolbar-left button) {
		height: 100%;
		min-height: 0;
		margin: 0 0.75rem 0 0;
		padding: 0 0.15rem;
		line-height: 1.3;
		box-shadow: none;
	}
	:global(.post-editor .carta-theme__default .carta-icon) {
		flex: 0 0 1.75rem;
		width: 1.75rem;
		height: 1.75rem;
		min-height: 0;
		margin: 0 0 0 0.15rem;
		padding: 0;
		box-shadow: none;
	}
	:global(.post-editor .carta-theme__default .carta-icon-full) {
		width: 100%;
		min-height: 0;
		margin: 0;
		padding: 0.35rem;
		box-shadow: none;
	}
	:global(.post-editor .carta-theme__default .carta-input),
	:global(.post-editor .carta-theme__default .carta-renderer) {
		height: clamp(24rem, 58vh, 36rem);
	}
	:global(.carta-font-code) {
		font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
		font-size: 0.92rem;
		line-height: 1.45;
	}
	details button {
		padding: 0.15rem 0.4rem;
		margin-left: 0.4rem;
		font-size: 0.78rem;
	}
	@media (max-width: 640px) {
		:global(.post-editor .carta-theme__default .carta-wrapper) {
			padding-inline: 0.75rem;
		}
		:global(.post-editor .carta-theme__default .carta-input),
		:global(.post-editor .carta-theme__default .carta-renderer) {
			height: 24rem;
		}
	}
</style>
