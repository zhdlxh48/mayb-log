import { describe, expect, it } from 'vitest';
import type { ListObjectsV2Command, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { clampImagePage, imagePageCount } from '$lib/post-editor/image-pagination';
import { listPostImages } from '$lib/server/media/images';

describe('S3 image listing', () => {
	it('follows every continuation token and orders valid images by upload time then key', async () => {
		const assetId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
		const firstId = '11111111-1111-4111-8111-111111111111';
		const secondId = '22222222-2222-4222-a222-222222222222';
		const oldestId = '33333333-3333-4333-b333-333333333333';
		const prefix = `posts/${assetId}/`;
		const calls: { Bucket?: string; Prefix?: string; ContinuationToken?: string }[] = [];
		const client = {
			async send(command: ListObjectsV2Command): Promise<ListObjectsV2CommandOutput> {
				calls.push(command.input);
				return command.input.ContinuationToken
					? {
							$metadata: {},
							Contents: [
								{ Key: `${prefix}${oldestId}.webp`, LastModified: new Date('2026-01-01') },
								{ Key: `${prefix}${firstId}.webp`, LastModified: new Date('2026-01-02') }
							],
							IsTruncated: false
						}
					: {
							$metadata: {},
							Contents: [
								{ Key: `${prefix}${secondId}.webp`, LastModified: new Date('2026-01-02') },
								{ Key: `${prefix}44444444-4444-4444-8444-444444444444.jpeg` },
								{ Key: `${prefix}33333333-3333-1333-8333-333333333333.webp` },
								{ Key: `${prefix}not-a-uuid.webp` }
							],
							IsTruncated: true,
							NextContinuationToken: 'next'
						};
			}
		};

		expect(await listPostImages(client, 'mayb-log-media', assetId)).toEqual(
			[oldestId, firstId, secondId].map((id) => ({
				id,
				url: `/media/${assetId}/${id}.webp`
			}))
		);
		expect(calls).toEqual([
			{ Bucket: 'mayb-log-media', Prefix: prefix, ContinuationToken: undefined },
			{ Bucket: 'mayb-log-media', Prefix: prefix, ContinuationToken: 'next' }
		]);
	});

	it('performs one list request for a single page', async () => {
		let calls = 0;
		const client = {
			async send(): Promise<ListObjectsV2CommandOutput> {
				calls += 1;
				return { $metadata: {}, Contents: [], IsTruncated: false };
			}
		};
		await listPostImages(client, 'mayb-log-media', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
		expect(calls).toBe(1);
	});
});

describe('image pagination', () => {
	it('keeps a valid page when images are added or removed', () => {
		expect(imagePageCount(0)).toBe(1);
		expect(imagePageCount(21)).toBe(2);
		expect(clampImagePage(2, 21)).toBe(2);
		expect(clampImagePage(2, 20)).toBe(1);
	});
});
