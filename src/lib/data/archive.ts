import type { AssetPath } from '$app/types';

// Sample data. Replace with your own nights (dates, notes, counts, tracklists)
// in src/lib/data/archive.ts. Everything on the archive pages is derived from here.

export type TrackSource = 'youtube' | 'spotify' | 'soundcloud';

export type ArchiveTrack = {
	title: string;
	artist: string;
	addedBy: string;
	genre: string;
	source?: TrackSource;
	videoId?: string;
	url?: string;
	reactions?: number;
	note?: string;
};

export type ChatMoment = {
	who: string;
	text: string;
	at: string;
};

export type NightAttendee = {
	name: string;
	avatar?: string;
	role?: string;
};

export type Night = {
	slug: string;
	date: string;
	iso: string;
	tag: string;
	title: string;
	note: string;
	hours: string;
	minutes: number;
	tracks: number;
	heads: number;
	seed: string;
	img?: AssetPath;
	joined: string[];
	attendees?: NightAttendee[];
	intentions: string[];
	tracklist: ArchiveTrack[];
	chatMoments: ChatMoment[];
};

export const nights: Night[] = [
	{
		slug: 'entoto-sunrise-addis-lock-in',
		date: 'Oct 18',
		iso: '2025-10-18T22:30:00',
		tag: 'Addis Ababa',
		title: 'Entoto sunrise & late night code',
		note: 'Overlooking Addis Ababa from Entoto as the city lights flickered below. Strong Ethiopian coffee, three bug fixes, and sunrise over the highlands.',
		hours: '7h 35m',
		minutes: 455,
		tracks: 5,
		heads: 9,
		seed: 'all-nighter-oct18',
		img: 'nights/ritual.jpg',
		joined: ['selam', 'solomon', 'dawit', 'natnael', 'yared'],
		intentions: [
			'refactor the realtime socket layer before dawn',
			'ship the v2 design system updates',
			'enjoy the coffee and keep the playlist rolling',
			'write clean database migrations without downtime',
			'stay locked in till the Entoto sunrise'
		],
		tracklist: [
			{ title: 'Yèkèrmo Sèw (A Man of Experience)', artist: 'Mulatu Astatke', addedBy: 'selam', genre: 'ethio-jazz', reactions: 18, note: 'classic late night Ethio-jazz' },
			{ title: 'Tezeta (Nostalgia)', artist: 'Mulatu Astatke', addedBy: 'dawit', genre: 'ethio-jazz', reactions: 15 },
			{ title: 'Midnight City', artist: 'M83', addedBy: 'solomon', genre: 'synthwave', source: 'youtube', videoId: 'dX3k_QDnzHE', reactions: 12 },
			{ title: 'Resonance', artist: 'HOME', addedBy: 'natnael', genre: 'synthwave', reactions: 14 },
			{ title: 'Blinding Lights', artist: 'The Weeknd', addedBy: 'yared', genre: 'pop', source: 'youtube', videoId: '4NRXx6U8ABQ', reactions: 10 }
		],
		chatMoments: []
	}
];

export function nightBySlug(slug: string): Night | undefined {
	return nights.find((night) => night.slug === slug);
}

export function contributors(): string[] {
	const set = new Set<string>();
	for (const night of nights) {
		for (const person of night.joined) {
			if (person && person.toLowerCase() !== 'autoplay') set.add(person);
		}
		for (const track of night.tracklist) {
			if (track.addedBy && track.addedBy.toLowerCase() !== 'autoplay') {
				set.add(track.addedBy);
			}
		}
	}
	return [...set].sort();
}

export function genres(): string[] {
	const set = new Set<string>();
	for (const night of nights) {
		for (const track of night.tracklist) set.add(track.genre);
	}
	return [...set].sort();
}

export function nightsFor(person: string): Night[] {
	return nights.filter((night) => night.joined.includes(person));
}

export function tracksFor(person: string): ArchiveTrack[] {
	return nights.flatMap((night) => night.tracklist.filter((track) => track.addedBy === person));
}

export type CrewProfile = {
	name: string;
	slug: string;
	nights: Night[];
	contributions: ArchiveTrack[];
	allNighters: number;
	topArtist: string;
	topGenre: string;
	favorite: ArchiveTrack | undefined;
};

export function buildCrewProfile(person: string, allNights: Night[]): CrewProfile {
	const clean = (person || '').trim().toLowerCase();
	const personNights = allNights.filter(
		(night) =>
			night.joined?.some((j) => (j || '').trim().toLowerCase() === clean) ||
			night.attendees?.some((a) => (a.name || '').trim().toLowerCase() === clean)
	);
	const contributions = allNights.flatMap((night) =>
		night.tracklist.filter((track) => (track.addedBy || '').trim().toLowerCase() === clean)
	);
	const artistCounts = new Map<string, number>();
	const genreCounts = new Map<string, number>();
	for (const track of contributions) {
		if (track.artist) artistCounts.set(track.artist, (artistCounts.get(track.artist) ?? 0) + 1);
		const g = (track.genre || '').trim().toLowerCase();
		if (g && g !== 'lo-fi' && g !== 'lofi') {
			genreCounts.set(track.genre, (genreCounts.get(track.genre) ?? 0) + 1);
		}
	}
	const top = (counts: Map<string, number>): string =>
		[...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
	const favorite = [...contributions].sort((a, b) => (b.reactions ?? 0) - (a.reactions ?? 0))[0];
	return {
		name: person,
		slug: person,
		nights: personNights,
		contributions,
		allNighters: personNights.length,
		topArtist: top(artistCounts),
		topGenre: top(genreCounts),
		favorite
	};
}

export function profileFor(person: string): CrewProfile {
	return buildCrewProfile(person, nights);
}

export type ArchiveStats = {
	nights: number;
	tracks: number;
	hours: number;
	longest: Night | undefined;
	topArtist: { name: string; count: number };
	topContributor: { name: string; count: number };
	topGenre: { name: string; count: number };
};

export function archiveStats(list: Night[] = nights): ArchiveStats {
	const artistCounts = new Map<string, number>();
	const contributorCounts = new Map<string, number>();
	const genreCounts = new Map<string, number>();
	let tracks = 0;
	let hours = 0;
	for (const night of list) {
		tracks += night.tracks;
		hours += night.minutes;
		for (const track of night.tracklist) {
			if (track.artist) artistCounts.set(track.artist, (artistCounts.get(track.artist) ?? 0) + 1);
			const addedBy = (track.addedBy || '').trim();
			if (
				addedBy &&
				addedBy.toLowerCase() !== 'autoplay' &&
				addedBy.toLowerCase() !== 'auto play' &&
				addedBy.toLowerCase() !== 'system'
			) {
				contributorCounts.set(addedBy, (contributorCounts.get(addedBy) ?? 0) + 1);
			}
			const g = (track.genre || '').trim().toLowerCase();
			if (g && g !== 'lo-fi' && g !== 'lofi') {
				genreCounts.set(track.genre, (genreCounts.get(track.genre) ?? 0) + 1);
			}
		}
	}
	const top = (counts: Map<string, number>): { name: string; count: number } => {
		const [entry] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
		return { name: entry?.[0] ?? '—', count: entry?.[1] ?? 0 };
	};
	const longest = [...list].sort((a, b) => b.minutes - a.minutes)[0];
	return {
		nights: list.length,
		tracks,
		hours: Math.round((hours / 60) * 10) / 10,
		longest,
		topArtist: top(artistCounts),
		topContributor: top(contributorCounts),
		topGenre: top(genreCounts)
	};
}
