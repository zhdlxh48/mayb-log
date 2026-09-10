export function isUniqueConflict(error: unknown) {
	return (
		error instanceof Error &&
		/UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE/i.test(error.message)
	);
}
