export function isUniqueConflict(error: unknown) {
	return (
		error instanceof Error &&
		/UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE/i.test(error.message)
	);
}

export function isForeignKeyConflict(error: unknown) {
	return (
		error instanceof Error &&
		/FOREIGN KEY constraint failed|SQLITE_CONSTRAINT_FOREIGNKEY/i.test(error.message)
	);
}
