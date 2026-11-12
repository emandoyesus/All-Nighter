import { nights } from '#lib/data/archive';
import { loadMyNights, dbArchiveToNight } from '#lib/data/local-logbook';
import { supabase } from '#lib/supabase';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = 'auto';
export const entries: EntryGenerator = () => nights.map((night) => ({ slug: night.slug }));

export const load: PageLoad = async ({ params }) => {
	const baseSlug = params.slug.replace(/-\d{4}-\d{2}-\d{2}$/, '');
	let night = nights.find((item) => item.slug === params.slug || item.slug === baseSlug);
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
	if (!night && supabase) {
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
				night = dbArchiveToNight(data);
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
	if (!night) error(404, 'That night is not in the logbook.');
	return { night };
};
