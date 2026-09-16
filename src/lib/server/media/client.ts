import { S3Client } from '@aws-sdk/client-s3';
import { serverConfig } from '$lib/server/env';

let client: S3Client | undefined;

export function mediaStore() {
	const config = serverConfig().s3;
	client ??= new S3Client({
		endpoint: config.endpoint,
		region: config.region,
		forcePathStyle: config.forcePathStyle,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey
		}
	});
	return { client, bucket: config.bucket };
}

export function closeMedia() {
	client?.destroy();
	client = undefined;
}
