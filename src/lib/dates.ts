const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function koreanDate(parts: number[]) {
	const [year, month, day, hour = 0, minute = 0] = parts;
	if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59) return null;
	const date = new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
	const korean = new Date(date.getTime() + 9 * 60 * 60 * 1000);
	return korean.getUTCFullYear() === year &&
		korean.getUTCMonth() + 1 === month &&
		korean.getUTCDate() === day &&
		korean.getUTCHours() === hour &&
		korean.getUTCMinutes() === minute
		? date
		: null;
}

export function parseKoreanDateTimeLocal(value: string) {
	const match = DATE_TIME_PATTERN.exec(value);
	return match ? koreanDate(match.slice(1).map(Number)) : null;
}

export function startOfKoreanDate(value: string) {
	const match = DATE_PATTERN.exec(value);
	return match ? koreanDate(match.slice(1).map(Number)) : null;
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
