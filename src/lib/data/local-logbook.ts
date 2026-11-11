import type { Night, ArchiveTrack } from './archive';

const LS_MY_NIGHTS = 'an.my_nights';

/** Slug filter to exclude developer test sessions and keep only canonical archives like Log #001 */
export function isTestArchiveSlug(slug: string): boolean {
	const s = (slug || '').trim().toLowerCase();
	return (
		s === 'k' ||
		s.startsWith('k-') ||
		s === 'skubidu' ||
		s.startsWith('skubidu-') ||
		s === 'sunshine' ||
		s.startsWith('sunshine-') ||
		s === 'first-night' ||
		s.startsWith('first-night-') ||
		s === 'triumph' ||
		s.startsWith('triumph-') ||
		s === 'trial' ||
		s.startsWith('trial-') ||
		s === 'test' ||
		s.startsWith('test-')
	);
}

export function loadMyNights(): Night[] {
	if (typeof window !== 'undefined') {
		try {
			localStorage.removeItem(LS_MY_NIGHTS);
		} catch {}
	}
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
	allAttendees?: Array<{ name: string; intention?: string }>,
	history?: Array<{ title: string; channel?: string; addedBy: string; videoId?: string | null; url?: string }>
): Night {
	const now = new Date();
	const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	const cleanSlug = `${roomName}-${now.toISOString().slice(0, 10)}`;

	// Combine all sources of tracks throughout the night: history, currently playing, and remaining queue
	const trackMap = new Map<string, { title: string; channel?: string; addedBy: string; videoId?: string | null; url?: string }>();
	for (const t of history || []) {
		const key = (t.videoId || t.title || '').trim();
		if (key) trackMap.set(key, t);
	}
	if (currentTrack) {
		const key = (currentTrack.videoId || currentTrack.title || '').trim();
		if (key) trackMap.set(key, currentTrack);
	}
	for (const t of queue || []) {
		const key = (t.videoId || t.title || '').trim();
		if (key) trackMap.set(key, t);
	}
	const allTracks = Array.from(trackMap.values());

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

export function dbArchiveToNight(row: any): Night {
	const started = row.started_at ? new Date(row.started_at) : new Date();
	const ended = row.ended_at ? new Date(row.ended_at) : new Date();
	const durationMs = Math.max(0, ended.getTime() - started.getTime());
	const totalMinutes = Math.round(durationMs / (60 * 1000)) || 360;
	const hoursPart = Math.floor(totalMinutes / 60);
	const minsPart = totalMinutes % 60;
	const hoursStr = `${hoursPart}h ${minsPart.toString().padStart(2, '0')}m`;

	const attendees = Array.isArray(row.attendees) ? row.attendees : [];
	const playlist = Array.isArray(row.playlist) ? row.playlist : [];

	const tracklist: ArchiveTrack[] = playlist.map((t: any) => ({
		title: t.title || 'Untitled Track',
		artist: t.channel || t.artist || 'YouTube',
		addedBy: t.addedBy || 'Crew',
		genre: t.genre || 'lo-fi',
		videoId: t.videoId || undefined,
		url: t.url || undefined
	}));

	const dateStr = ended.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

	return {
		slug: row.slug,
		date: dateStr,
		iso: row.ended_at || row.started_at || new Date().toISOString(),
		tag: 'All Nighter',
		title: row.title || row.slug,
		note: row.summary || `Session with ${attendees.length || 1} awake till sunrise.`,
		hours: hoursStr,
		minutes: totalMinutes,
		tracks: tracklist.length,
		heads: Math.max(attendees.length, 1),
		seed: row.slug,
		joined: attendees.map((a: any) => (typeof a === 'string' ? a : a.name || 'Anonymous')),
		intentions: [],
		tracklist,
		chatMoments: Array.isArray(row.moments) ? row.moments : []
	};
}
