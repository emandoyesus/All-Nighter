import type { Night, ArchiveTrack } from './archive';

const LS_MY_NIGHTS = 'an.my_nights';

export function loadMyNights(): Night[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(LS_MY_NIGHTS);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) return parsed;
	} catch {}
	return [];
}

export function saveToMyNights(night: Night): void {
	if (typeof window === 'undefined') return;
	try {
		const list = loadMyNights();
		// Deduplicate by slug or iso
		const next = [night, ...list.filter((item) => item.slug !== night.slug)];
		localStorage.setItem(LS_MY_NIGHTS, JSON.stringify(next));
	} catch {}
}

export function buildNightFromRoom(
	roomName: string,
	roomTitle: string,
	awake: Array<{ name: string; intention?: string }>,
	currentTrack: { title: string; channel?: string; addedBy: string; videoId?: string | null; url?: string } | null,
	queue: Array<{ title: string; channel?: string; addedBy: string; videoId?: string | null; url?: string }>,
	allAttendees?: Array<{ name: string; intention?: string }>
): Night {
	const now = new Date();
	const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	const cleanSlug = `${roomName}-${now.toISOString().slice(0, 10)}`;

	const allTracks = [...(currentTrack ? [currentTrack] : []), ...queue];
	const tracklist: ArchiveTrack[] = allTracks.map((t) => ({
		title: t.title,
		artist: t.channel ?? 'YouTube',
		addedBy: t.addedBy,
		genre: 'lo-fi',
		videoId: t.videoId ?? undefined,
		url: t.url
	}));

	// Combine currently awake crew and everyone who joined and left during the night
	const roster = allAttendees && allAttendees.length > 0 ? allAttendees : awake;
	const joinedNames = Array.from(new Set(roster.map((p) => p.name.trim()).filter(Boolean)));
	const allIntentions = Array.from(
		new Set(roster.map((p) => p.intention).filter((i): i is string => Boolean(i?.trim())))
	);

	const note =
		joinedNames.length > awake.length
			? `Session with ${awake.length} awake at sunrise (${joinedNames.length} joined throughout the night).`
			: `Session with ${awake.length} awake till sunrise.`;

	return {
		slug: cleanSlug,
		date: dateStr,
		iso: now.toISOString(),
		tag: 'All Nighter',
		title: roomTitle || roomName,
		note,
		hours: '6h 00m',
		minutes: 360,
		tracks: tracklist.length,
		heads: Math.max(awake.length, joinedNames.length),
		seed: cleanSlug,
		joined: joinedNames,
		intentions: allIntentions,
		tracklist,
		chatMoments: []
	};
}
