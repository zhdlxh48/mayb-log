import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

const { Pool } = pg;
const database = {
	host: '127.0.0.1',
	port: 5432,
	user: 'mayb_log_test',
	password: 'mayb-log-test-password'
};
const pool = new Pool({ ...database, database: 'mayb_log_test' });
const admin = new Pool({ ...database, database: 'postgres' });
const failureDatabase = 'mayb_log_migration_failure';
let failureContainer;

function compose(...args) {
	return execFileSync('docker', ['compose', '-f', 'compose.test.yaml', ...args], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe']
	}).trim();
}

async function waitForApp() {
	for (let attempt = 0; attempt < 60; attempt += 1) {
		try {
			if ((await fetch('http://127.0.0.1:5173/')).ok) return;
		} catch {
			// The container is still restarting.
		}
		await delay(1_000);
	}
	throw new Error('App did not become healthy after restart');
}

async function verifySchema() {
	const columns = await pool.query(`
		SELECT table_name, column_name, data_type, is_identity, identity_generation, udt_name
		FROM information_schema.columns
		WHERE (table_name, column_name) IN (
			('series', 'id'), ('posts', 'id'), ('categories', 'id'),
			('posts', 'series_id'), ('post_categories', 'post_id'),
			('post_categories', 'category_id'), ('post_tags', 'post_id'),
			('posts', 'asset_id')
		)
	`);
	const byColumn = new Map(
		columns.rows.map((row) => [`${row.table_name}.${row.column_name}`, row])
	);
	for (const name of ['series.id', 'posts.id', 'categories.id']) {
		const column = byColumn.get(name);
		assert.equal(column?.data_type, 'bigint');
		assert.equal(column?.is_identity, 'YES');
		assert.equal(column?.identity_generation, 'ALWAYS');
	}
	for (const name of [
		'posts.series_id',
		'post_categories.post_id',
		'post_categories.category_id',
		'post_tags.post_id'
	]) {
		assert.equal(byColumn.get(name)?.data_type, 'bigint');
	}
	assert.equal(byColumn.get('posts.asset_id')?.udt_name, 'uuid');

	const sequences = await pool.query(`
		SELECT sequencename, max_value::text
		FROM pg_sequences
		WHERE sequencename IN ('series_id_seq', 'posts_id_seq', 'categories_id_seq')
	`);
	assert.equal(sequences.rowCount, 3);
	for (const sequence of sequences.rows) {
		assert.equal(sequence.max_value, String(Number.MAX_SAFE_INTEGER));
	}

	const extension = await pool.query(`SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'`);
	assert.equal(extension.rowCount, 1);
	const index = await pool.query(
		`SELECT 1 FROM pg_indexes WHERE indexname = 'posts_search_trgm_idx'`
	);
	assert.equal(index.rowCount, 1);
	const migrations = await pool.query(
		`SELECT count(*)::int AS value FROM drizzle.__drizzle_migrations`
	);
	assert.equal(migrations.rows[0]?.value, 1);
}

async function verifyRestart() {
	await pool.query(
		`INSERT INTO categories (name, description) VALUES ($1, '') ON CONFLICT (name) DO NOTHING`,
		['migration-restart-marker']
	);
	compose('restart', 'app');
	await waitForApp();
	const marker = await pool.query(`SELECT 1 FROM categories WHERE name = $1`, [
		'migration-restart-marker'
	]);
	assert.equal(marker.rowCount, 1);
	await pool.query(`DELETE FROM categories WHERE name = $1`, ['migration-restart-marker']);
}

async function verifyMigrationFailure() {
	await admin.query(`DROP DATABASE IF EXISTS ${failureDatabase} WITH (FORCE)`);
	await admin.query(`CREATE DATABASE ${failureDatabase}`);
	const conflicting = new Pool({ ...database, database: failureDatabase });
	await conflicting.query(`CREATE TABLE "user" (id text PRIMARY KEY)`);
	await conflicting.end();

	failureContainer = compose('run', '-d', '--no-deps', 'migration-failure-app');
	let state;
	for (let attempt = 0; attempt < 30; attempt += 1) {
		state = JSON.parse(
			execFileSync('docker', ['inspect', '--format={{json .State}}', failureContainer], {
				encoding: 'utf8'
			})
		);
		if (!state.Running) break;
		await delay(1_000);
	}
	assert.equal(state?.Running, false, 'App kept running after a migration conflict');
	assert.notEqual(state?.ExitCode, 0, 'App exited successfully after a migration conflict');
}

try {
	compose('down', '--volumes', '--remove-orphans');
	compose('up', '-d', '--no-build');
	await waitForApp();
	await verifySchema();
	await verifyRestart();
	await verifyMigrationFailure();
	console.log('Migration integration checks passed');
} finally {
	if (failureContainer) execFileSync('docker', ['rm', '-f', failureContainer], { stdio: 'ignore' });
	await pool.end();
	await admin.query(`DROP DATABASE IF EXISTS ${failureDatabase} WITH (FORCE)`);
	await admin.end();
	compose('down', '--volumes', '--remove-orphans');
}
