import { describe, expect, it } from 'vitest';
import { clampImagePage, imagePageCount } from '$lib/post-editor/image-pagination';
import { listPostImages } from '$lib/server/media/images';
import { requirePlatform } from '$lib/server/platform';

describe('R2 image listing', () => {
	it('follows every cursor and orders valid images by upload time then key', async () => {
		const assetId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
		const firstId = '11111111-1111-4111-8111-111111111111';
		const secondId = '22222222-2222-4222-a222-222222222222';
		const oldestId = '33333333-3333-4333-b333-333333333333';
		const prefix = `posts/${assetId}/`;
		const calls: { prefix?: string; cursor?: string }[] = [];
		const bucket = {
			async list(options: { prefix?: string; cursor?: string }) {
				calls.push(options);
				return options.cursor
					? {
							objects: [
								{ key: `${prefix}${oldestId}.webp`, uploaded: new Date('2026-01-01') },
								{ key: `${prefix}${firstId}.webp`, uploaded: new Date('2026-01-02') }
							],
							truncated: false
						}
					: {
							objects: [
								{ key: `${prefix}${secondId}.webp`, uploaded: new Date('2026-01-02') },
								{
									key: `${prefix}44444444-4444-4444-8444-444444444444.jpeg`,
									uploaded: new Date('2025-01-01')
								},
								{
									key: `${prefix}33333333-3333-1333-8333-333333333333.webp`,
									uploaded: new Date('2025-01-01')
								},
								{ key: `${prefix}not-a-uuid.webp`, uploaded: new Date('2025-01-01') }
							],
							truncated: true,
							cursor: 'next'
						};
			}
		} as unknown as R2Bucket;

		expect(await listPostImages(bucket, assetId)).toEqual(
			[oldestId, firstId, secondId].map((id) => ({
				id,
				url: `/media/${assetId}/${id}.webp`
			}))
		);
		expect(calls).toEqual([{ prefix }, { prefix, cursor: 'next' }]);
	});

	it('performs one list request for a single page', async () => {
		let calls = 0;
		await listPostImages(
			{
				async list() {
					calls += 1;
					return { objects: [], truncated: false };
				}
			} as unknown as R2Bucket,
			'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
		);
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

describe('Cloudflare platform boundary', () => {
	it('returns the runtime or raises an explicit 500 error', () => {
		const platform = {} as App.Platform;
		expect(requirePlatform(platform)).toBe(platform);
		try {
			requirePlatform(undefined);
			expect.unreachable();
		} catch (cause) {
			expect(cause).toMatchObject({ status: 500 });
		}
	});
});
