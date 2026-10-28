import { nights } from '#lib/data/archive';
import { loadMyNights } from '#lib/data/local-logbook';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => nights.map((night) => ({ slug: night.slug }));

export const load: PageLoad = ({ params }) => {
	let night = nights.find((item) => item.slug === params.slug);
	if (!night && typeof window !== 'undefined') {
		const myNights = loadMyNights();
		night = myNights.find((item) => item.slug === params.slug);
	}
	if (!night) error(404, 'That night is not in the logbook.');
	return { night };
};
