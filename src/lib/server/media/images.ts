import { ListObjectsV2Command, type ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
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

type ObjectLister = {
	send(command: ListObjectsV2Command): Promise<ListObjectsV2CommandOutput>;
};

export async function listPostImages(client: ObjectLister, bucket: string, assetId: string) {
	const prefix = `posts/${assetId}/`;
	const objects: { Key?: string; LastModified?: Date }[] = [];
	let continuationToken: string | undefined;
	do {
		const result = await client.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: prefix,
				ContinuationToken: continuationToken
			})
		);
		objects.push(...(result.Contents ?? []));
		continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
	} while (continuationToken);
	return objects
		.filter((object): object is { Key: string; LastModified?: Date } => Boolean(object.Key))
		.filter(({ Key }) => Key.endsWith('.webp'))
		.filter(({ Key }) => UUID.test(Key.slice(prefix.length, -'.webp'.length)))
		.sort(
			(a, b) =>
				(a.LastModified?.getTime() ?? 0) - (b.LastModified?.getTime() ?? 0) ||
				(a.Key < b.Key ? -1 : a.Key > b.Key ? 1 : 0)
		)
		.map(({ Key }) => {
			const id = Key.slice(prefix.length, -'.webp'.length);
			return { id, url: mediaUrl(assetId, id) };
		});
}
