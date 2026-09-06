import { site } from '../config/site.ts';

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: site.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
});

export function dateParts(date: Date) {
  const parts = partsFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)!.value;
  return { year: value('year'), month: value('month'), day: value('day') };
}

export function formatDate(date: Date): string {
  const { year, month, day } = dateParts(date);
  return `${year}-${month}-${day}`;
}
