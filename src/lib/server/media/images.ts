const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

export async function validWebp(file: File) {
	if (file.size === 0 || file.size > MAX_IMAGE_SIZE || file.type !== 'image/webp') return false;
	const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
	return (
		String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
		String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
	);
}
