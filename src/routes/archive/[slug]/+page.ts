import { nights } from '#lib/data/archive';
import { loadMyNights, dbArchiveToNight, saveToMyNights } from '#lib/data/local-logbook';
import { supabase } from '#lib/supabase';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = 'auto';
export const entries: EntryGenerator = () => nights.map((night) => ({ slug: night.slug }));

export const load: PageLoad = async ({ params }) => {
	const baseSlug = params.slug.replace(/-\d{4}-\d{2}-\d{2}$/, '');

	// 1. Check static nights (demo)
	let night = nights.find((item) => item.slug === params.slug || item.slug === baseSlug);

	// 2. Fetch canonical Supabase archive (contains full multi-user attendee roster)
	if (supabase) {
		try {
			const orFilter = `slug.eq."${params.slug}",slug.like."${params.slug}-%",slug.eq."${baseSlug}",slug.like."${baseSlug}-%"`;
			const { data } = await supabase
				.from('session_archives')
				.select('*')
				.or(orFilter)
				.order('ended_at', { ascending: false })
				.limit(1)
				.maybeSingle();

			if (data) {
				const dbNight = dbArchiveToNight(data);
				// If local night exists in browser, merge attendee rosters to ensure full crew is present
				if (typeof window !== 'undefined') {
					const myNights = loadMyNights();
					const localMatch = myNights.find(
						(item) => item.slug === params.slug || item.slug === baseSlug || item.slug.startsWith(baseSlug + '-')
					);
					if (localMatch) {
						const allJoined = Array.from(new Set([...(dbNight.joined || []), ...(localMatch.joined || [])]));
						dbNight.joined = allJoined;
						const attendeeMap = new Map<string, any>();
						for (const a of [...(localMatch.attendees || []), ...(dbNight.attendees || [])]) {
							if (a && a.name) attendeeMap.set(a.name.toLowerCase(), a);
						}
						dbNight.attendees = Array.from(attendeeMap.values());
						dbNight.heads = Math.max(allJoined.length, dbNight.heads || 1);
					}
					// Persist canonical merged record back into localStorage so user's cache is healed
					try {
						saveToMyNights(dbNight);
					} catch {}
				}
				night = dbNight;
			} else {
				const { data: roomData } = await supabase
					.from('rooms')
					.select('*')
					.or(orFilter)
					.order('created_at', { ascending: false })
					.limit(1)
					.maybeSingle();
				if (roomData) {
					night = dbArchiveToNight({
						slug: roomData.slug,
						title: roomData.title || roomData.slug,
						started_at: roomData.created_at,
						ended_at: roomData.closed_at || new Date().toISOString(),
						attendees: [roomData.host_name || 'Host'],
						playlist: roomData.playback_state?.queue || [],
						summary: 'Overnight lock-in session archived at sunrise'
					});
				}
			}
		} catch (err) {
			console.warn('[ArchiveDetail] Failed to load from Supabase:', err);
		}
	}

	// 3. Fallback to localStorage if offline or Supabase didn't have it
	if (!night && typeof window !== 'undefined') {
		const myNights = loadMyNights();
		night = myNights.find(
			(item) =>
				item.slug === params.slug ||
				item.slug === baseSlug ||
				item.slug.startsWith(params.slug + '-') ||
				item.slug.startsWith(baseSlug + '-')
		);
	}

	if (!night) error(404, 'That night is not in the logbook.');
	return { night };
};
