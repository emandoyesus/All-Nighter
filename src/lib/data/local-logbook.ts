import type { Night, ArchiveTrack } from './archive';

const LS_MY_NIGHTS = 'an.my_nights';

/** Slug filter to exclude developer test sessions and keep only canonical archives like Log #001 and the real Asylum */
export function isTestArchiveSlug(slug: string): boolean {
	const s = (slug || '').trim().toLowerCase();
	// Preserve authentic sessions
	if (s.startsWith('the-asylum')) return false;
	if (s === 'entoto-sunrise-addis-lock-in') return false;

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
		s.startsWith('test-') ||
		s === 'provatee' ||
		s.startsWith('provatee-') ||
		s === 'abc' ||
		s.startsWith('abc-') ||
		s === 'mad' ||
		s.startsWith('mad-') ||
		s === 'se-devs' ||
		s.startsWith('se-devs-') ||
		s === 'taju-emando' ||
		s.startsWith('taju-emando-') ||
		s === 'late-night-shift' ||
		s.startsWith('late-night-shift-')
	);
}

export function loadMyNights(): Night[] {
	if (typeof window !== 'undefined') {
		try {
			const raw = localStorage.getItem(LS_MY_NIGHTS);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					// Purge test and duplicate entries from user's local storage automatically
					const cleaned = parsed.filter((item) => !isTestArchiveSlug(item.slug));
					if (cleaned.length !== parsed.length) {
						try {
							localStorage.setItem(LS_MY_NIGHTS, JSON.stringify(cleaned));
						} catch {}
					}
					return cleaned;
				}
			}
		} catch {}
	}
	return [];
}

export function toArchiveSlug(roomName: string, date = new Date()): string {
	const clean = (roomName || 'all-nighter')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
	return `${clean}-${date.toISOString().slice(0, 10)}`;
}

export function saveToMyNights(night: Night): void {
	if (typeof window === 'undefined') return;
	try {
		const list = loadMyNights();
		// Deduplicate: same slug, or same room on same date
		const base = night.slug.replace(/-\d{4}-\d{2}-\d{2}$/, '');
		const filtered = list.filter((item) => {
			if (item.slug === night.slug) return false;
			const itemBase = item.slug.replace(/-\d{4}-\d{2}-\d{2}$/, '');
			if (itemBase === base && item.date === night.date) return false;
			return true;
		});
		const next = [night, ...filtered];
		localStorage.setItem(LS_MY_NIGHTS, JSON.stringify(next));
	} catch {}
}

export function buildNightFromRoom(
	roomName: string,
	roomTitle: string,
	awake: Array<{ name: string; intention?: string; avatar?: string; self?: boolean }>,
	currentTrack: { title: string; channel?: string; addedBy: string; videoId?: string | null; url?: string } | null,
	queue: Array<{ title: string; channel?: string; addedBy: string; videoId?: string | null; url?: string }>,
	allAttendees?: Array<{ name: string; intention?: string; avatar?: string }>,
	history?: Array<{ title: string; channel?: string; addedBy: string; videoId?: string | null; url?: string }>
): Night {
	const now = new Date();
	const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	const cleanSlug = toArchiveSlug(roomName, now);

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
	const attendeeList = roster.map((p) => ({
		name: p.name.trim(),
		avatar: p.avatar,
		role: p.name.trim() === awake.find((a) => a.self)?.name ? 'Host' : 'Crew'
	}));
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
		attendees: attendeeList,
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

	const attendeesRaw = Array.isArray(row.attendees) ? row.attendees : [];
	const attendeeList: Array<{ name: string; avatar?: string; role?: string }> = attendeesRaw.map((a: any) => {
		if (typeof a === 'string') {
			return { name: a };
		}
		return {
			name: a.name || 'Anonymous',
			avatar: a.avatar,
			role: a.role
		};
	});
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
		note: row.summary || `Session with ${attendeeList.length || 1} awake till sunrise.`,
		hours: hoursStr,
		minutes: totalMinutes,
		tracks: tracklist.length,
		heads: Math.max(attendeeList.length, 1),
		seed: row.slug,
		joined: attendeeList.map((a) => a.name),
		attendees: attendeeList,
		intentions: [],
		tracklist,
		chatMoments: Array.isArray(row.moments) ? row.moments : []
	};
}
