import { MAX_IMAGE_BYTES } from '$lib/limits';
import { mediaUrl, UUID } from './path';

export async function validWebp(file: File) {
	if (file.size === 0 || file.size > MAX_IMAGE_BYTES || file.type !== 'image/webp') return false;
	const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
	return (
		String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
		String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
	);
}

export async function listPostImages(bucket: R2Bucket, assetId: string) {
	const prefix = `posts/${assetId}/`;
	const objects: R2Object[] = [];
	let cursor: string | undefined;
	let truncated = true;
	while (truncated) {
		const result = await bucket.list(cursor ? { prefix, cursor } : { prefix });
		objects.push(...result.objects);
		truncated = result.truncated;
		cursor = result.truncated ? result.cursor : undefined;
	}
	return objects
		.filter(({ key }) => key.endsWith('.webp'))
		.filter(({ key }) => UUID.test(key.slice(prefix.length, -'.webp'.length)))
		.sort(
			(a, b) =>
				a.uploaded.getTime() - b.uploaded.getTime() || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
		)
		.map(({ key }) => {
			const id = key.slice(prefix.length, -'.webp'.length);
			return { id, url: mediaUrl(assetId, id) };
		});
}
