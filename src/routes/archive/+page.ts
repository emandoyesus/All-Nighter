import { supabase } from '#lib/supabase';
import { dbArchiveToNight, isTestArchiveSlug } from '#lib/data/local-logbook';
import type { PageLoad } from './$types';
import type { Night } from '#lib/data/archive';

export const load: PageLoad = async () => {
	const dbNights: Night[] = [];

	if (supabase) {
		try {
			// Strategy #1 & #3: Pre-fetch lightweight list columns directly during route resolution
			const { data: archives, error } = await supabase
				.from('session_archives')
				.select('slug, title, started_at, ended_at, attendees, summary, playlist')
				.order('ended_at', { ascending: false });

			if (!error && archives && archives.length > 0) {
				const seenSlugs = new Set<string>();
				for (const a of archives) {
					if (!seenSlugs.has(a.slug) && !isTestArchiveSlug(a.slug)) {
						seenSlugs.add(a.slug);
						dbNights.push(dbArchiveToNight(a));
					}
				}
			}
		} catch (err) {
			console.warn('[ArchivePreload] Failed to preload archives:', err);
		}
	}

	return {
		dbNights
	};
};
