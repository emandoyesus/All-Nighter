import { loadMyNights } from './local-logbook';
import { nights } from './archive';

const LS_USER_STATS = 'an.user_stats';

export interface PersistentStats {
	tracksQueued: number;
	focusMinutes: number;
	roomsHosted: number;
	intentionsSet: number;
	dawnRituals: number;
	customUnlocks: string[];
}

export interface Achievement {
	id: string;
	title: string;
	description: string;
	category: 'survival' | 'music' | 'focus' | 'community';
	emoji: string;
	icon: 'sun' | 'moon' | 'disc' | 'award' | 'flame' | 'target' | 'crown' | 'sparkles' | 'bolt';
	current: number;
	target: number;
	unlocked: boolean;
	tier: 'bronze' | 'silver' | 'gold' | 'neon';
}

export interface UserProfileStats {
	nightsCount: number;
	totalMinutes: number;
	totalHoursFormatted: string;
	tracksQueued: number;
	dawnRituals: number;
	streak: number;
	focusMinutes: number;
	roomsHosted: number;
	intentionsSet: number;
	rank: {
		title: string;
		level: number;
		progress: number;
		nextTitle: string;
	};
	achievements: Achievement[];
	unlockedCount: number;
	totalAchievements: number;
}

function loadPersistentStats(): PersistentStats {
	if (typeof window === 'undefined') {
		return {
			tracksQueued: 0,
			focusMinutes: 0,
			roomsHosted: 0,
			intentionsSet: 0,
			dawnRituals: 0,
			customUnlocks: []
		};
	}
	try {
		const raw = localStorage.getItem(LS_USER_STATS);
		if (raw) {
			const parsed = JSON.parse(raw);
			return {
				tracksQueued: Number(parsed.tracksQueued) || 0,
				focusMinutes: Number(parsed.focusMinutes) || 0,
				roomsHosted: Number(parsed.roomsHosted) || 0,
				intentionsSet: Number(parsed.intentionsSet) || 0,
				dawnRituals: Number(parsed.dawnRituals) || 0,
				customUnlocks: Array.isArray(parsed.customUnlocks) ? parsed.customUnlocks : []
			};
		}
	} catch {}
	return {
		tracksQueued: 0,
		focusMinutes: 0,
		roomsHosted: 0,
		intentionsSet: 0,
		dawnRituals: 0,
		customUnlocks: []
	};
}

export function savePersistentStats(stats: PersistentStats): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(LS_USER_STATS, JSON.stringify(stats));
		window.dispatchEvent(new CustomEvent('an:stats-updated'));
	} catch {}
}

export function recordStat(key: keyof Omit<PersistentStats, 'customUnlocks'>, amount = 1): void {
	const current = loadPersistentStats();
	current[key] = (current[key] || 0) + amount;
	savePersistentStats(current);
}

/** Calculate user rank based on total nocturnal minutes */
function calculateRank(totalMinutes: number, nightsCount: number) {
	if (totalMinutes >= 2880 || nightsCount >= 8) {
		return {
			title: 'Solar Vanguard',
			level: 5,
			progress: 100,
			nextTitle: 'Max Rank'
		};
	}
	if (totalMinutes >= 1440 || nightsCount >= 4) {
		const prog = Math.min(100, Math.round(((totalMinutes - 1440) / 1440) * 100));
		return {
			title: 'Dawn Warden',
			level: 4,
			progress: prog,
			nextTitle: 'Solar Vanguard'
		};
	}
	if (totalMinutes >= 720 || nightsCount >= 2) {
		const prog = Math.min(100, Math.round(((totalMinutes - 720) / 720) * 100));
		return {
			title: 'Midnight Architect',
			level: 3,
			progress: prog,
			nextTitle: 'Dawn Warden'
		};
	}
	if (totalMinutes >= 360 || nightsCount >= 1) {
		const prog = Math.min(100, Math.round(((totalMinutes - 360) / 360) * 100));
		return {
			title: 'Night Shift Veteran',
			level: 2,
			progress: prog,
			nextTitle: 'Midnight Architect'
		};
	}
	const prog = Math.min(100, Math.round((totalMinutes / 360) * 100));
	return {
		title: 'Night Owl',
		level: 1,
		progress: prog,
		nextTitle: 'Night Shift Veteran'
	};
}

/** Get full user stats and computed achievements */
export function getUserProfileStats(callsign?: string): UserProfileStats {
	const persistent = loadPersistentStats();
	const myNights = loadMyNights();

	// Match archive nights if callsign provided
	const archiveMatches = callsign
		? nights.filter((n) => n.joined.some((j) => j.toLowerCase() === callsign.toLowerCase()))
		: [];

	// Deduplicated nights count
	const allSlugs = new Set([...myNights.map((n) => n.slug), ...archiveMatches.map((n) => n.slug)]);
	const nightsCount = allSlugs.size;

	// Total nocturnal minutes
	let totalMinutes = persistent.focusMinutes;
	for (const n of myNights) {
		totalMinutes += n.minutes || 360;
	}
	for (const n of archiveMatches) {
		if (!myNights.some((m) => m.slug === n.slug)) {
			totalMinutes += n.minutes || 360;
		}
	}

	const hours = Math.floor(totalMinutes / 60);
	const mins = totalMinutes % 60;
	const totalHoursFormatted = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;

	// Total tracks
	let tracksCount = persistent.tracksQueued;
	for (const n of myNights) {
		tracksCount += (n.tracklist || []).length;
	}

	// Dawn rituals
	const dawnRitualsCount = Math.max(persistent.dawnRituals, myNights.length);

	// Rank
	const rank = calculateRank(totalMinutes, nightsCount);

	// Streak
	const streak = myNights.length > 0 ? Math.min(myNights.length, 7) : 0;

	// Achievements Definitions with unique iconic emojis
	const achievements: Achievement[] = [
		{
			id: 'first-light',
			title: 'First Light',
			description: 'Complete your first full all-nighter till sunrise',
			category: 'survival',
			emoji: '☀️',
			icon: 'sun',
			current: nightsCount,
			target: 1,
			unlocked: nightsCount >= 1,
			tier: 'bronze'
		},
		{
			id: 'midnight-intention',
			title: 'Nocturnal Intention',
			description: 'Declare your nocturnal project intention in the room',
			category: 'focus',
			emoji: '🎯',
			icon: 'target',
			current: persistent.intentionsSet,
			target: 1,
			unlocked: persistent.intentionsSet >= 1,
			tier: 'bronze'
		},
		{
			id: 'aux-selector',
			title: 'Aux Selector',
			description: 'Add 5 or more tracks to the collaborative room queue',
			category: 'music',
			emoji: '💿',
			icon: 'disc',
			current: tracksCount,
			target: 5,
			unlocked: tracksCount >= 5,
			tier: 'silver'
		},
		{
			id: 'sunrise-survivor',
			title: 'Sunrise Survivor',
			description: 'Reach 06:00 AM dawn during a live active room session',
			category: 'survival',
			emoji: '🔥',
			icon: 'flame',
			current: dawnRitualsCount,
			target: 1,
			unlocked: dawnRitualsCount >= 1,
			tier: 'silver'
		},
		{
			id: 'room-architect',
			title: 'The Architect',
			description: 'Create and host your own night session room',
			category: 'community',
			emoji: '👑',
			icon: 'crown',
			current: persistent.roomsHosted,
			target: 1,
			unlocked: persistent.roomsHosted >= 1,
			tier: 'silver'
		},
		{
			id: 'focus-centurion',
			title: 'Focus Centurion',
			description: 'Accumulate 100+ minutes in deep Pomodoro focus sprints',
			category: 'focus',
			emoji: '⚡',
			icon: 'bolt',
			current: persistent.focusMinutes,
			target: 100,
			unlocked: persistent.focusMinutes >= 100,
			tier: 'gold'
		},
		{
			id: 'night-veteran',
			title: 'Shift Veteran',
			description: 'Survive 3 or more logged all-nighter sessions',
			category: 'survival',
			emoji: '🌙',
			icon: 'moon',
			current: nightsCount,
			target: 3,
			unlocked: nightsCount >= 3,
			tier: 'gold'
		},
		{
			id: 'dawn-warden',
			title: 'Dawn Warden',
			description: 'Log 24 total hours locked in with the crew',
			category: 'survival',
			emoji: '🏆',
			icon: 'award',
			current: totalMinutes,
			target: 1440,
			unlocked: totalMinutes >= 1440,
			tier: 'neon'
		}
	];

	const unlockedCount = achievements.filter((a) => a.unlocked).length;

	return {
		nightsCount,
		totalMinutes,
		totalHoursFormatted,
		tracksQueued: tracksCount,
		dawnRituals: dawnRitualsCount,
		streak,
		focusMinutes: persistent.focusMinutes,
		roomsHosted: persistent.roomsHosted,
		intentionsSet: persistent.intentionsSet,
		rank,
		achievements,
		unlockedCount,
		totalAchievements: achievements.length
	};
}
