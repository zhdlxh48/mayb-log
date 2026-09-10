export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function mediaKey(assetId: string, imageId: string) {
	return `posts/${assetId}/${imageId}.webp`;
}

export function mediaUrl(assetId: string, imageId: string) {
	return `/media/${assetId}/${imageId}.webp`;
}
