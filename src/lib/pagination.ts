export const POSTS_PER_PAGE = 20;

export function pagination(currentPage: number, totalItems: number) {
	const lastPage = Math.max(1, Math.ceil(totalItems / POSTS_PER_PAGE));
	const current = Math.min(Math.max(1, currentPage), lastPage);
	const blockStart = Math.floor((current - 1) / 10) * 10 + 1;
	const blockEnd = Math.min(blockStart + 9, lastPage);
	const pages = Array.from({ length: blockEnd - blockStart + 1 }, (_, index) => blockStart + index);

	return {
		current,
		last: lastPage,
		pages,
		previousBlock: blockStart > 1 ? blockStart - 1 : null,
		nextBlock: blockEnd < lastPage ? blockEnd + 1 : null
	};
}

export function requestedPage(value: string | null) {
	const page = Number(value ?? 1);
	return Number.isInteger(page) && page > 0 ? page : 1;
}
