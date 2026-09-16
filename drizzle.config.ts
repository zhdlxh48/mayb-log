import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: ['./src/lib/server/db/schema/auth.ts', './src/lib/server/db/schema/content.ts'],
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		host: process.env.PGHOST ?? '127.0.0.1',
		port: Number(process.env.PGPORT ?? 5432),
		database: process.env.PGDATABASE ?? 'mayb_log',
		user: process.env.PGUSER ?? 'mayb_log',
		password: process.env.PGPASSWORD ?? 'mayb-log-local'
	}
});
