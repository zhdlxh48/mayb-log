import { env } from '$env/dynamic/private';

function required(name: string) {
	const value = env[name];
	if (!value) throw new Error(`${name} is required`);
	return value;
}

export function serverConfig() {
	return {
		siteUrl: required('SITE_URL'),
		betterAuthSecret: required('BETTER_AUTH_SECRET'),
		turnstileSiteKey: required('TURNSTILE_SITE_KEY'),
		turnstileSecretKey: required('TURNSTILE_SECRET_KEY'),
		postgres: {
			host: required('PGHOST'),
			port: Number(env.PGPORT ?? 5432),
			database: required('PGDATABASE'),
			user: required('PGUSER'),
			password: required('PGPASSWORD')
		},
		s3: {
			endpoint: required('S3_ENDPOINT'),
			region: required('S3_REGION'),
			bucket: required('S3_BUCKET'),
			accessKeyId: required('S3_ACCESS_KEY_ID'),
			secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
			forcePathStyle: (env.S3_FORCE_PATH_STYLE ?? 'true').toLowerCase() === 'true'
		}
	};
}
