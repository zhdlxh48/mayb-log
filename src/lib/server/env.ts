import { env } from '$env/dynamic/private';
import { z } from 'zod';

const httpUrl = z.url({ protocol: /^https?$/ });

const nonEmpty = z.string().trim().min(1);
const credential = z.string().refine((value) => value.trim().length > 0);

const serverEnvSchema = z.object({
	SITE_URL: httpUrl,
	BETTER_AUTH_SECRET: credential.min(32),
	TURNSTILE_SITE_KEY: credential,
	TURNSTILE_SECRET_KEY: credential,
	PGHOST: nonEmpty,
	PGPORT: z.coerce.number().int().min(1).max(65_535).default(5432),
	PGDATABASE: nonEmpty,
	PGUSER: credential,
	PGPASSWORD: credential,
	S3_ENDPOINT: httpUrl,
	S3_REGION: nonEmpty,
	S3_BUCKET: nonEmpty,
	S3_ACCESS_KEY_ID: credential,
	S3_SECRET_ACCESS_KEY: credential,
	S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).transform((value) => value === 'true')
});

export function parseServerConfig(source: Record<string, string | undefined>) {
	const result = serverEnvSchema.safeParse(source);
	if (!result.success) {
		const fields = [
			...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'environment')))
		];
		throw new Error(`Invalid server environment: ${fields.join(', ')}`);
	}
	const value = result.data;
	return Object.freeze({
		siteUrl: value.SITE_URL,
		betterAuthSecret: value.BETTER_AUTH_SECRET,
		turnstileSiteKey: value.TURNSTILE_SITE_KEY,
		turnstileSecretKey: value.TURNSTILE_SECRET_KEY,
		postgres: Object.freeze({
			host: value.PGHOST,
			port: value.PGPORT,
			database: value.PGDATABASE,
			user: value.PGUSER,
			password: value.PGPASSWORD
		}),
		s3: Object.freeze({
			endpoint: value.S3_ENDPOINT,
			region: value.S3_REGION,
			bucket: value.S3_BUCKET,
			accessKeyId: value.S3_ACCESS_KEY_ID,
			secretAccessKey: value.S3_SECRET_ACCESS_KEY,
			forcePathStyle: value.S3_FORCE_PATH_STYLE
		})
	});
}

let config: ReturnType<typeof parseServerConfig> | undefined;

export function serverConfig() {
	return (config ??= parseServerConfig(env));
}
