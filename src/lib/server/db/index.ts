import { drizzle } from 'drizzle-orm/d1';
import * as authSchema from './schema/auth';
import * as contentSchema from './schema/content';

export const database = (binding: D1Database) =>
	drizzle(binding, { schema: { ...authSchema, ...contentSchema } });

export type Database = ReturnType<typeof database>;
