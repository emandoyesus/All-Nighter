export type AvatarPreset = {
	id: string;
	name: string;
	url: string;
	description: string;
	tagline?: string;
};

export const NOCTURNAL_AVATARS: AvatarPreset[] = [
	{
		id: 'architect',
		name: 'The Architect',
		url: '/avatars/architect.webp',
		description: 'Quiet focus & clear structure',
		tagline: 'Quiet focus'
	},
	{
		id: 'wanderer',
		name: 'The Wanderer',
		url: '/avatars/wanderer.webp',
		description: 'Looking upward, chasing ideas',
		tagline: 'Chasing ideas'
	},
	{
		id: 'listener',
		name: 'The Listener',
		url: '/avatars/listener.webp',
		description: 'Headphones on, lost in rhythm',
		tagline: 'Lost in rhythm'
	},
	{
		id: 'stargazer',
		name: 'The Stargazer',
		url: '/avatars/stargazer.webp',
		description: 'Daydreaming past midnight',
		tagline: 'Past midnight'
	},
	{
		id: 'hacker',
		name: 'The Hacker',
		url: '/avatars/hacker.webp',
		description: 'Hoodie up, code flowing',
		tagline: 'Code flowing'
	},
	{
		id: 'artist',
		name: 'The Artist',
		url: '/avatars/artist.webp',
		description: 'Late night creative spark',
		tagline: 'Creative spark'
	}
];

export const DEFAULT_AVATAR = '/avatars/architect.webp';

/**
 * Deterministically resolves a profile picture for a given person.
 * Checks custom avatar, current user's profile, session attendees cache, and falls back to
 * a nocturnal avatar preset.
 */
export function getAvatarForPerson(name: string, customAvatar?: string, roomSlug?: string): string {
	if (customAvatar && typeof customAvatar === 'string' && customAvatar.trim()) {
		return customAvatar.trim();
	}

	const cleanName = (name || '').trim();
	const lowerName = cleanName.toLowerCase();
	if (!lowerName) return DEFAULT_AVATAR;

	if (typeof window !== 'undefined') {
		try {
			// 1. Check if name matches current local user (callsign / google / auth profile)
			const localCallsign = (
				localStorage.getItem('an.callsign') ||
				localStorage.getItem('an.name') ||
				''
			).trim().toLowerCase();

			if (
				localCallsign &&
				(localCallsign === lowerName || lowerName.includes(localCallsign) || localCallsign.includes(lowerName))
			) {
				const localAvatar = localStorage.getItem('an.avatar');
				if (localAvatar && localAvatar.trim()) return localAvatar.trim();
			}

			// 2. Check room attendees snapshot if roomSlug is known
			if (roomSlug) {
				const base = roomSlug.replace(/-\d{4}-\d{2}-\d{2}$/, '');
				const rawAttendees =
					localStorage.getItem('an.attendees.' + roomSlug) ||
					localStorage.getItem('an.attendees.' + base);
				if (rawAttendees) {
					const attendees = JSON.parse(rawAttendees);
					if (Array.isArray(attendees)) {
						const found = attendees.find(
							(a: any) => (a.name || '').trim().toLowerCase() === lowerName
						);
						if (found?.avatar && typeof found.avatar === 'string' && found.avatar.trim()) {
							return found.avatar.trim();
						}
					}
				}
			}

			// 3. Check general cached crew avatars
			const rawCrew = localStorage.getItem('an.crew_avatars');
			if (rawCrew) {
				const crewMap = JSON.parse(rawCrew);
				if (crewMap[lowerName]) return crewMap[lowerName];
			}
		} catch {}
	}

	// 4. Fallback to consistent, deterministic nocturnal avatar preset
	let hash = 0;
	for (let i = 0; i < lowerName.length; i++) {
		hash = (hash << 5) - hash + lowerName.charCodeAt(i);
		hash |= 0;
	}
	const index = Math.abs(hash) % NOCTURNAL_AVATARS.length;
	return NOCTURNAL_AVATARS[index].url;
}

export function cacheCrewAvatar(name: string, avatar: string): void {
	if (typeof window === 'undefined' || !name || !avatar) return;
	try {
		const lowerName = name.trim().toLowerCase();
		const raw = localStorage.getItem('an.crew_avatars') || '{}';
		const map = JSON.parse(raw);
		map[lowerName] = avatar.trim();
		localStorage.setItem('an.crew_avatars', JSON.stringify(map));
	} catch {}
}
