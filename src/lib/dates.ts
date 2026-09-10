const KST_OFFSET = '+09:00';

export function startOfKoreanDate(value: string) {
	const date = new Date(`${value}T00:00:00${KST_OFFSET}`);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function afterKoreanDate(value: string) {
	const date = startOfKoreanDate(value);
	if (!date) return null;
	date.setUTCDate(date.getUTCDate() + 1);
	return date;
}

export function dateTimeLocal(date: Date | null) {
	if (!date) return '';
	return new Intl.DateTimeFormat('sv-SE', {
		timeZone: 'Asia/Seoul',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	})
		.format(date)
		.replace(' ', 'T');
}
