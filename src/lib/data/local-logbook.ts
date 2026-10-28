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
	queue: Array<{ title: string; channel?: string; addedBy: string; videoId?: string | null; url?: string }>
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

	return {
		slug: cleanSlug,
		date: dateStr,
		iso: now.toISOString(),
		tag: 'All Nighter',
		title: roomTitle || roomName,
		note: `Session with ${awake.length} awake till sunrise.`,
		hours: '6h 00m',
		minutes: 360,
		tracks: tracklist.length,
		heads: awake.length,
		seed: cleanSlug,
		img: 'nights/night-1.jpg' as any,
		joined: awake.map((p) => p.name),
		intentions: awake.map((p) => p.intention).filter((i): i is string => !!i),
		tracklist,
		chatMoments: []
	};
}
