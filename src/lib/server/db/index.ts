import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { serverConfig } from '$lib/server/env';
import * as authSchema from './schema/auth';
import * as contentSchema from './schema/content';

const schema = { ...authSchema, ...contentSchema };
let pool: Pool | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function database() {
	if (!pool) pool = new Pool(serverConfig().postgres);
	return (db ??= drizzle(pool, { schema }));
}

export async function migrateDatabase() {
	await migrate(database(), { migrationsFolder: 'drizzle' });
}

export async function closeDatabase() {
	await pool?.end();
	pool = undefined;
	db = undefined;
}

export type Database = ReturnType<typeof database>;
