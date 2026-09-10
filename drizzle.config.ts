import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: ['./src/lib/server/db/schema/auth.ts', './src/lib/server/db/schema/content.ts'],
	out: './drizzle',
	dialect: 'sqlite'
});
