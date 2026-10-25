import { nights } from '#lib/data/archive';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => nights.map((night) => ({ slug: night.slug }));

export const load: PageLoad = ({ params }) => {
	const night = nights.find((item) => item.slug === params.slug);
	if (!night) error(404, 'That night is not in the logbook.');
	return { night };
};
