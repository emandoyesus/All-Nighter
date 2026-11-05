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
	intentions: string[];
	tracklist: ArchiveTrack[];
	chatMoments: ChatMoment[];
};

export type UpcomingSession = {
	slug: string;
	title: string;
	theme: string;
	date: string;
	iso: string;
	blurb: string;
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
		tracks: 48,
		heads: 9,
		seed: 'all-nighter-oct18',
		img: 'nights/ritual.jpg',
		joined: ['elena', 'solomon', 'sam', 'nate', 'yared'],
		intentions: [
			'refactor the realtime socket layer before dawn',
			'ship the v2 design system updates',
			'enjoy the coffee and keep the playlist rolling',
			'write clean database migrations without downtime',
			'stay locked in till the Entoto sunrise'
		],
		tracklist: [
			{ title: 'Yèkèrmo Sèw (A Man of Experience)', artist: 'Mulatu Astatke', addedBy: 'elena', genre: 'ethio-jazz', reactions: 18, note: 'classic late night Ethio-jazz' },
			{ title: 'Tezeta (Nostalgia)', artist: 'Mulatu Astatke', addedBy: 'sam', genre: 'ethio-jazz', reactions: 15 },
			{ title: 'shinjuku fm, soft lofi / smooth jazz', artist: 'TOKYO TONES', addedBy: 'solomon', genre: 'lofi', source: 'youtube', videoId: '2CDRu6-Vgfo', reactions: 12 },
			{ title: 'Resonance', artist: 'HOME', addedBy: 'nate', genre: 'synthwave', reactions: 14 },
			{ title: 'beats to relax / study to', artist: 'Lofi Girl', addedBy: 'yared', genre: 'lofi', source: 'youtube', videoId: 'rFZHOHl-L8A', reactions: 10 }
		],
		chatMoments: [
			{ who: 'elena', text: 'the coffee here in addis hits completely different at 3am', at: '03:15' },
			{ who: 'solomon', text: 'pull request approved and merged cleanly', at: '05:22' },
			{ who: 'sam', text: 'sunrise over the mountains right now is unreal', at: '06:05' }
		]
	}
];

export const upcoming: UpcomingSession[] = [];

export function nightBySlug(slug: string): Night | undefined {
	return nights.find((night) => night.slug === slug);
}

export function contributors(): string[] {
	const set = new Set<string>();
	for (const night of nights) {
		for (const person of night.joined) set.add(person);
		for (const track of night.tracklist) set.add(track.addedBy);
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

export function profileFor(person: string): CrewProfile {
	const personNights = nightsFor(person);
	const contributions = tracksFor(person);
	const artistCounts = new Map<string, number>();
	const genreCounts = new Map<string, number>();
	for (const track of contributions) {
		artistCounts.set(track.artist, (artistCounts.get(track.artist) ?? 0) + 1);
		genreCounts.set(track.genre, (genreCounts.get(track.genre) ?? 0) + 1);
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

export type ArchiveStats = {
	nights: number;
	tracks: number;
	hours: number;
	longest: Night | undefined;
	topArtist: { name: string; count: number };
	topContributor: { name: string; count: number };
	topGenre: { name: string; count: number };
};

export function archiveStats(): ArchiveStats {
	const artistCounts = new Map<string, number>();
	const contributorCounts = new Map<string, number>();
	const genreCounts = new Map<string, number>();
	let tracks = 0;
	let hours = 0;
	for (const night of nights) {
		tracks += night.tracks;
		hours += night.minutes;
		for (const track of night.tracklist) {
			artistCounts.set(track.artist, (artistCounts.get(track.artist) ?? 0) + 1);
			contributorCounts.set(track.addedBy, (contributorCounts.get(track.addedBy) ?? 0) + 1);
			genreCounts.set(track.genre, (genreCounts.get(track.genre) ?? 0) + 1);
		}
	}
	const top = (counts: Map<string, number>): { name: string; count: number } => {
		const [entry] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
		return { name: entry?.[0] ?? '—', count: entry?.[1] ?? 0 };
	};
	const longest = [...nights].sort((a, b) => b.minutes - a.minutes)[0];
	return {
		nights: nights.length,
		tracks,
		hours: Math.round((hours / 60) * 10) / 10,
		longest,
		topArtist: top(artistCounts),
		topContributor: top(contributorCounts),
		topGenre: top(genreCounts)
	};
}
