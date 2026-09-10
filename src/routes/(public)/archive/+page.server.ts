import { getArchive } from '$lib/server/db/queries/archive';
import { requestDb } from '$lib/server/db/request';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const rows = await getArchive(requestDb(platform));
	const years: {
		year: string;
		count: number;
		months: { month: string; count: number; href: string }[];
	}[] = [];
	for (const row of rows) {
		let year = years.find((item) => item.year === row.year);
		if (!year) {
			year = { year: row.year, count: 0, months: [] };
			years.push(year);
		}
		const lastDay = new Date(Date.UTC(Number(row.year), Number(row.month), 0)).getUTCDate();
		year.count += row.count;
		year.months.push({
			month: row.month,
			count: row.count,
			href: `/search?from=${row.year}-${row.month}-01&to=${row.year}-${row.month}-${String(lastDay).padStart(2, '0')}`
		});
	}
	return { years, siteUrl: platform?.env.SITE_URL ?? '' };
};
