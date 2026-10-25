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
	img: AssetPath;
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
		slug: 'the-night-the-race-condition-died',
		date: 'Mar 14',
		iso: '2025-03-14T23:10:00',
		tag: 'Midterms',
		title: 'The night the race condition died',
		note: 'Two laptops arguing about error handling until the sky went orange. The fix arrived at 5:41.',
		hours: '7h 12m',
		minutes: 432,
		tracks: 41,
		heads: 6,
		seed: 'all-nighter-mar14',
		img: 'nights/night-1.jpg',
		joined: ['ember-owl-42', 'quiet-fox-17', 'slow-kettle-08', 'warm-lamp-63', 'late-radio-29', 'dim-moth-55'],
		intentions: [
			'fix the race condition in the socket handler before 6am',
			'finish the auth middleware and write the unit tests',
			'just here to listen and not fall asleep tbh',
			'clean up the API response types, finally',
			'prep the slides for the 9am demo',
			'get the CI pipeline to stop being dramatic'
		],
		tracklist: [
			{ title: 'beats to relax / study to', artist: 'Lofi Girl', addedBy: 'ember-owl-42', genre: 'lofi', source: 'youtube', videoId: 'rFZHOHl-L8A', reactions: 14, note: 'the one that started it' },
			{ title: 'Nightcall', artist: 'Kavinsky', addedBy: 'quiet-fox-17', genre: 'synthwave', reactions: 9 },
			{ title: 'Midnight City', artist: 'M83', addedBy: 'late-radio-29', genre: 'synthwave', reactions: 11 },
			{ title: 'An Ending (Ascent)', artist: 'Brian Eno', addedBy: 'warm-lamp-63', genre: 'ambient', reactions: 7 },
			{ title: 'Chillhop Radio', artist: 'Chillhop Music', addedBy: 'slow-kettle-08', genre: 'lofi', source: 'youtube', videoId: '5yx6BWlEVcY', reactions: 12 },
			{ title: 'Weird Fishes / Arpeggi', artist: 'Radiohead', addedBy: 'dim-moth-55', genre: 'alternative', reactions: 8 },
			{ title: 'Breathe', artist: 'Télépopmusik', addedBy: 'quiet-fox-17', genre: 'electronic', reactions: 5 },
			{ title: 'Sunset Lover', artist: 'Petit Biscuit', addedBy: 'ember-owl-42', genre: 'electronic', reactions: 6 },
			{ title: 'Weightless', artist: 'Marconi Union', addedBy: 'warm-lamp-63', genre: 'ambient', reactions: 4 },
			{ title: 'Nocturne in E-flat', artist: 'Chopin', addedBy: 'late-radio-29', genre: 'classical', reactions: 3, note: 'played at 5:41' }
		],
		chatMoments: [
			{ who: 'quiet-fox-17', text: 'the test finally passes. i am going to cry', at: '05:41' },
			{ who: 'ember-owl-42', text: 'do NOT merge yet, let me look', at: '05:44' },
			{ who: 'warm-lamp-63', text: 'sunrise check. it is orange out there', at: '06:02' }
		]
	},
	{
		slug: 'three-apis-and-one-sunrise',
		date: 'Apr 28',
		iso: '2025-04-28T22:40:00',
		tag: 'Project deadline',
		title: 'Three APIs and one sunrise',
		note: 'Demo at nine. The deploy log screenshot is still pinned in the chat, next to the pizza receipt.',
		hours: '9h 03m',
		minutes: 543,
		tracks: 57,
		heads: 8,
		seed: 'all-nighter-apr28',
		img: 'nights/night-2.jpg',
		joined: ['night-owl-11', 'soft-cloud-84', 'first-monitor-02', 'last-match-39', 'late-radio-29', 'warm-lamp-63', 'dim-moth-55', 'quiet-fox-17'],
		intentions: [
			'wire up all three APIs before the demo at 9am',
			'write the integration tests for the payments endpoint',
			'get the frontend build to stop complaining about types',
			'deploy to staging, fix whatever breaks, repeat',
			'review PRs that have been sitting there for three days',
			'design the onboarding screens, finally',
			'debug the CORS nightmare on the third API',
			'just moral support, here for the pizza'
		],
		tracklist: [
			{ title: 'Nightride FM, synthwave radio', artist: 'Nightride FM', addedBy: 'night-owl-11', genre: 'synthwave', source: 'youtube', videoId: 'UjlMEqTu2KI', reactions: 16 },
			{ title: 'Resonance', artist: 'HOME', addedBy: 'soft-cloud-84', genre: 'synthwave', reactions: 13 },
			{ title: 'Intro', artist: 'The xx', addedBy: 'first-monitor-02', genre: 'indie', reactions: 7 },
			{ title: 'Instant Crush', artist: 'Daft Punk', addedBy: 'last-match-39', genre: 'electronic', reactions: 10 },
			{ title: 'shinjuku fm, soft lofi / smooth jazz', artist: 'TOKYO TONES', addedBy: 'late-radio-29', genre: 'lofi', source: 'youtube', videoId: '2CDRu6-Vgfo', reactions: 11 },
			{ title: 'Dreams', artist: 'Fleetwood Mac', addedBy: 'warm-lamp-63', genre: 'classic rock', reactions: 9 },
			{ title: 'Teardrop', artist: 'Massive Attack', addedBy: 'dim-moth-55', genre: 'trip-hop', reactions: 12 },
			{ title: 'Sunset', artist: 'The Midnight', addedBy: 'night-owl-11', genre: 'synthwave', reactions: 8 },
			{ title: 'Alright', artist: 'Kendrick Lamar', addedBy: 'quiet-fox-17', genre: 'hip-hop', reactions: 6 },
			{ title: 'Vienna', artist: 'Billy Joel', addedBy: 'soft-cloud-84', genre: 'classic rock', reactions: 5, note: 'for the 6am walk home' }
		],
		chatMoments: [
			{ who: 'first-monitor-02', text: 'api #3 just returned a 418. i am a teapot now', at: '01:12' },
			{ who: 'night-owl-11', text: 'deploy is green. i repeat, deploy is green', at: '05:58' },
			{ who: 'warm-lamp-63', text: 'pizza receipt pinned for posterity', at: '06:20' }
		]
	},
	{
		slug: 'rain-one-amplifier-no-regrets',
		date: 'Jun 03',
		iso: '2025-06-03T23:30:00',
		tag: 'Finals week',
		title: 'Rain, one amplifier, no regrets',
		note: 'Someone brought a second speaker. The library closed early. We did not.',
		hours: '5h 47m',
		minutes: 347,
		tracks: 33,
		heads: 5,
		seed: 'all-nighter-jun03',
		img: 'nights/night-3.jpg',
		joined: ['slow-kettle-08', 'ember-owl-42', 'soft-cloud-84', 'late-radio-29', 'dim-moth-55'],
		intentions: [
			'finish the finals essay, at least the introduction',
			'get through the problem sets before my brain gives up',
			'study orgo until I actually understand it or the sun rises',
			'annotate every lecture slide from week 8 onwards',
			'write the conclusion I have been avoiding for two weeks'
		],
		tracklist: [
			{ title: 'beats to sleep / chill to', artist: 'Lofi Girl', addedBy: 'slow-kettle-08', genre: 'lofi', source: 'youtube', videoId: 'JD-kMIpDfnY', reactions: 10 },
			{ title: 'Holocene', artist: 'Bon Iver', addedBy: 'ember-owl-42', genre: 'indie folk', reactions: 9 },
			{ title: 'Rain Song', artist: 'Led Zeppelin', addedBy: 'soft-cloud-84', genre: 'classic rock', reactions: 6 },
			{ title: 'Pink + White', artist: 'Frank Ocean', addedBy: 'late-radio-29', genre: 'r&b', reactions: 12 },
			{ title: 'Motion Picture Soundtrack', artist: 'Radiohead', addedBy: 'dim-moth-55', genre: 'alternative', reactions: 8 },
			{ title: 'cliché', artist: 'mxmtoon', addedBy: 'ember-owl-42', genre: 'indie', reactions: 4 },
			{ title: 'The Night We Met', artist: 'Lord Huron', addedBy: 'soft-cloud-84', genre: 'indie folk', reactions: 7 },
			{ title: 'Space Song', artist: 'Beach House', addedBy: 'slow-kettle-08', genre: 'dream pop', reactions: 11 },
			{ title: 'Nights', artist: 'Frank Ocean', addedBy: 'late-radio-29', genre: 'r&b', reactions: 5 }
		],
		chatMoments: [
			{ who: 'soft-cloud-84', text: 'the second speaker is clipping and i do not care', at: '03:05' },
			{ who: 'slow-kettle-08', text: 'rain is louder than the music now', at: '03:48' },
			{ who: 'dim-moth-55', text: 'library closed 2 hours ago lol', at: '04:10' }
		]
	},
	{
		slug: 'new-group-chat-same-couch',
		date: 'Sep 22',
		iso: '2025-09-22T22:00:00',
		tag: 'First lock-in',
		title: 'New group chat, same couch',
		note: 'Fresh semester, old rituals. Nobody remembered to eat dinner, everybody remembered the aux rules.',
		hours: '6h 28m',
		minutes: 388,
		tracks: 46,
		heads: 7,
		seed: 'all-nighter-sep22',
		img: 'nights/night-4.jpg',
		joined: ['first-monitor-02', 'night-owl-11', 'quiet-fox-17', 'warm-lamp-63', 'last-match-39', 'ember-owl-42', 'soft-cloud-84'],
		intentions: [
			'set up the repo for the new semester project',
			'read the brief and write a plan before doing anything',
			'catch up on two weeks of missed readings',
			'sketch out the database schema, nothing fancy',
			'order dinner before everywhere closes, then study',
			'figure out what the group project is actually about',
			'set up my dev environment, it broke over the summer'
		],
		tracklist: [
			{ title: 'shinjuku fm, soft lofi / smooth jazz', artist: 'TOKYO TONES', addedBy: 'first-monitor-02', genre: 'lofi', source: 'youtube', videoId: '2CDRu6-Vgfo', reactions: 15 },
			{ title: 'Buddy Holly', artist: 'Weezer', addedBy: 'night-owl-11', genre: 'alternative', reactions: 8 },
			{ title: 'Electric Feel', artist: 'MGMT', addedBy: 'quiet-fox-17', genre: 'indie', reactions: 9 },
			{ title: 'Nightfall', artist: 'Little Dragon', addedBy: 'warm-lamp-63', genre: 'electronic', reactions: 6 },
			{ title: 'Lost in the World', artist: 'Kanye West', addedBy: 'last-match-39', genre: 'hip-hop', reactions: 7 },
			{ title: 'Lovers Rock', artist: 'TV Girl', addedBy: 'ember-owl-42', genre: 'indie pop', reactions: 13 },
			{ title: '505', artist: 'Arctic Monkeys', addedBy: 'soft-cloud-84', genre: 'indie rock', reactions: 11 },
			{ title: 'Sofia', artist: 'Clairo', addedBy: 'quiet-fox-17', genre: 'indie pop', reactions: 5 },
			{ title: 'New Person, Same Old Mistakes', artist: 'Tame Impala', addedBy: 'night-owl-11', genre: 'psych pop', reactions: 10 }
		],
		chatMoments: [
			{ who: 'first-monitor-02', text: 'aux rules posted. read them. live them.', at: '22:14' },
			{ who: 'ember-owl-42', text: 'nobody ate dinner did they', at: '00:31' },
			{ who: 'last-match-39', text: 'ordering bread at 2am, reply with a number', at: '02:02' }
		]
	}
];

export const upcoming: UpcomingSession[] = [
	{
		slug: 'nineties-night',
		title: '90s night',
		theme: '90s',
		date: 'Fri · 11:00 pm',
		iso: '2026-10-30T23:00:00',
		blurb: 'Baggy jeans, burned CDs, one aux cable. Bring the songs you pretend you are over.'
	},
	{
		slug: 'study-beats',
		title: 'Study beats',
		theme: 'focus',
		date: 'Wed · 10:30 pm',
		iso: '2026-11-04T22:30:00',
		blurb: 'No lyrics, no skipping. Just lofi, rain, and whatever deadline is breathing down your neck.'
	}
];

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
