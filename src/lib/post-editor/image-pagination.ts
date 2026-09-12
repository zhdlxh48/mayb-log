import { IMAGE_EDITOR_PAGE_SIZE } from '$lib/limits';

export function imagePageCount(imageCount: number) {
	return Math.max(1, Math.ceil(imageCount / IMAGE_EDITOR_PAGE_SIZE));
}

export function clampImagePage(page: number, imageCount: number) {
	return Math.min(Math.max(1, page), imagePageCount(imageCount));
}
