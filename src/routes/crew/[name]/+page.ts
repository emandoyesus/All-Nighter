import { contributors, profileFor } from '#lib/data/archive';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => contributors().map((name) => ({ name }));

export const load: PageLoad = ({ params }) => {
	const profile = profileFor(params.name);
	if (profile.nights.length === 0) error(404, 'That callsign is not in the logbook.');
	return { profile };
};
