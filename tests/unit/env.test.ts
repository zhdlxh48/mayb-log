import { describe, expect, it } from 'vitest';
import { parseServerConfig } from '$lib/server/env';

const valid = {
	SITE_URL: 'https://blog.mayb.moe',
	BETTER_AUTH_SECRET: 'a'.repeat(32),
	TURNSTILE_SITE_KEY: 'site-key',
	TURNSTILE_SECRET_KEY: 'secret-key',
	PGHOST: 'postgres',
	PGPORT: '5432',
	PGDATABASE: 'mayb_log',
	PGUSER: 'mayb_log',
	PGPASSWORD: 'password',
	S3_ENDPOINT: 'http://garage:3900',
	S3_REGION: 'garage',
	S3_BUCKET: 'mayb-log-media',
	S3_ACCESS_KEY_ID: 'access-key',
	S3_SECRET_ACCESS_KEY: 's3-secret',
	S3_FORCE_PATH_STYLE: 'true'
};

describe('server environment', () => {
	it('parses typed runtime settings', () => {
		const config = parseServerConfig({ ...valid, PGPORT: '6543', S3_FORCE_PATH_STYLE: 'false' });
		expect(config.postgres.port).toBe(6543);
		expect(config.s3.forcePathStyle).toBe(false);
	});

	it.each([
		['SITE_URL', 'ftp://example.com'],
		['BETTER_AUTH_SECRET', 'too-short'],
		['PGPORT', '65536'],
		['S3_ENDPOINT', 'not-a-url'],
		['S3_FORCE_PATH_STYLE', 'yes']
	])('rejects invalid %s without exposing its value', (field, value) => {
		let message = '';
		try {
			parseServerConfig({ ...valid, [field]: value });
		} catch (error) {
			message = error instanceof Error ? error.message : String(error);
		}
		expect(message).toContain(field);
		expect(message).not.toContain(value);
	});
});
