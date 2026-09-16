export function isUniqueConflict(error: unknown) {
	return errorCode(error) === '23505';
}

export function isForeignKeyConflict(error: unknown) {
	return errorCode(error) === '23503';
}

function errorCode(error: unknown): string | undefined {
	let current = error;
	for (let depth = 0; depth < 3 && current && typeof current === 'object'; depth += 1) {
		if ('code' in current && typeof current.code === 'string') return current.code;
		current = 'cause' in current ? current.cause : undefined;
	}
}
