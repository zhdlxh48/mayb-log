<script lang="ts">
	import imageCompression from 'browser-image-compression';
	import { IMAGE_EDITOR_PAGE_SIZE, MAX_IMAGE_BYTES } from '$lib/limits';
	import * as m from '$lib/paraglide/messages.js';
	import { clampImagePage, imagePageCount as countImagePages } from './image-pagination';
	import type { EditorImage } from './types';

	let {
		assetId,
		initialImages = [],
		onInsert
	} = $props<{
		assetId: string;
		initialImages?: EditorImage[];
		onInsert: (url: string) => void;
	}>();

	function loadedImages() {
		return [...initialImages];
	}
	let images = $state<EditorImage[]>(loadedImages());
	let selectedImageIds = $state<string[]>([]);
	let imagePage = $state(1);
	let mediaBusy = $state(false);
	let mediaError = $state('');
	let imagePageCount = $derived(countImagePages(images.length));
	let visibleImages = $derived(
		images.slice((imagePage - 1) * IMAGE_EDITOR_PAGE_SIZE, imagePage * IMAGE_EDITOR_PAGE_SIZE)
	);

	function goToImagePage(page: number) {
		if (mediaBusy) return;
		const nextPage = clampImagePage(page, images.length);
		if (nextPage === imagePage) return;
		imagePage = nextPage;
		selectedImageIds = [];
	}

	function selectImage(imageId: string, selected: boolean) {
		if (mediaBusy) return;
		selectedImageIds = selected
			? [...selectedImageIds, imageId]
			: selectedImageIds.filter((id) => id !== imageId);
	}

	async function upload(file: File) {
		if (mediaBusy) return;
		mediaError = '';
		mediaBusy = true;
		try {
			const compressed = await imageCompression(file, {
				maxSizeMB: MAX_IMAGE_BYTES / 1024 / 1024,
				maxWidthOrHeight: 1600,
				initialQuality: 0.82,
				fileType: 'image/webp',
				useWebWorker: false
			});
			const body = new FormData();
			body.set('file', compressed, 'image.webp');
			const response = await fetch(`/api/media/${assetId}`, { method: 'POST', body });
			if (!response.ok) throw new Error(m.image_upload_error());
			const image: EditorImage = await response.json();
			images = [...images, image];
			const lastPage = countImagePages(images.length);
			if (lastPage !== imagePage) {
				imagePage = lastPage;
				selectedImageIds = [];
			}
			onInsert(image.url);
		} catch (error) {
			mediaError = error instanceof Error ? error.message : m.image_upload_error();
		} finally {
			mediaBusy = false;
		}
	}

	async function removeSelected() {
		if (mediaBusy || !selectedImageIds.length || !confirm(m.delete_selected_images_confirm()))
			return;
		mediaError = '';
		const imageIds = [...selectedImageIds];
		mediaBusy = true;
		try {
			const response = await fetch(`/api/media/${assetId}`, {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ imageIds })
			});
			if (!response.ok) throw new Error();
			const removed = new Set(imageIds);
			images = images.filter(({ id }) => !removed.has(id));
			selectedImageIds = [];
			imagePage = clampImagePage(imagePage, images.length);
		} catch {
			mediaError = m.image_delete_error();
		} finally {
			mediaBusy = false;
		}
	}
</script>

<label class="file-action"
	>{m.upload_image()}<input
		type="file"
		accept="image/jpeg,image/png,image/webp"
		disabled={mediaBusy}
		onchange={(event) => {
			const file = event.currentTarget.files?.[0];
			event.currentTarget.value = '';
			if (file) void upload(file);
		}}
	/></label
>

{#if mediaError}<p role="alert">{mediaError}</p>{/if}

{#if images.length}
	<section class="images" aria-labelledby="images-heading">
		<h2 id="images-heading">{m.images()}</h2>
		<ul class="image-grid">
			{#each visibleImages as image}
				<li class="image-item" data-image-id={image.id}>
					<input
						type="checkbox"
						disabled={mediaBusy}
						checked={selectedImageIds.includes(image.id)}
						aria-label={`${m.select_image()} ${image.id.slice(0, 8)}`}
						onchange={(event) => selectImage(image.id, event.currentTarget.checked)}
					/>
					<img src={image.url} alt="" />
					<button
						type="button"
						aria-label={`${m.insert()} ${image.id.slice(0, 8)}`}
						onclick={() => onInsert(image.url)}>{m.insert()}</button
					>
				</li>
			{/each}
		</ul>
		{#if imagePageCount > 1}
			<nav class="image-pager" aria-label={m.pagination_label()}>
				<button
					type="button"
					disabled={mediaBusy || imagePage === 1}
					onclick={() => goToImagePage(imagePage - 1)}>{m.previous_image_page()}</button
				>
				<span>{m.image_page()} {imagePage} / {imagePageCount}</span>
				<button
					type="button"
					disabled={mediaBusy || imagePage === imagePageCount}
					onclick={() => goToImagePage(imagePage + 1)}>{m.next_image_page()}</button
				>
			</nav>
		{/if}
		<button type="button" disabled={mediaBusy || !selectedImageIds.length} onclick={removeSelected}
			>{m.delete_selected_images()} ({selectedImageIds.length})</button
		>
	</section>
{/if}

<style>
	.file-action {
		display: inline-block;
		padding: 0.3rem 0.7rem;
		border: 1px solid #999;
		border-radius: 2px;
		background: #f3f3f3;
		cursor: pointer;
	}
	.file-action:has(input:disabled) {
		cursor: default;
		opacity: 0.55;
	}
	.file-action input {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
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
	.image-pager {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		margin-bottom: 0.65rem;
	}
</style>
