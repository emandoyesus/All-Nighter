import { contributors, nights, buildCrewProfile, type Night } from '#lib/data/archive';
import { loadMyNights, dbArchiveToNight } from '#lib/data/local-logbook';
import { supabase } from '#lib/supabase';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = 'auto';
export const entries: EntryGenerator = () => contributors().map((name) => ({ name }));

export const load: PageLoad = async ({ params }) => {
	const person = params.name;

	// 1. Static nights
	const combined: Night[] = [...nights];

	// 2. Local nights (browser)
	if (typeof window !== 'undefined') {
		const myNights = loadMyNights();
		for (const mn of myNights) {
			if (!combined.some((n) => n.slug === mn.slug)) {
				combined.push(mn);
			}
		}
	}

	// 3. Supabase session archives
	if (supabase) {
		try {
			const { data: dbArchives } = await supabase
				.from('session_archives')
				.select('*')
				.order('ended_at', { ascending: false });

			if (dbArchives) {
				for (const d of dbArchives) {
					if (!combined.some((n) => n.slug === d.slug)) {
						combined.push(dbArchiveToNight(d));
					}
				}
			}
		} catch (err) {
			console.warn('[CrewProfile] Failed to fetch archives from Supabase:', err);
		}
	}

	const profile = buildCrewProfile(person, combined);
	return { profile };
};
