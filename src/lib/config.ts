/** Site-wide knobs your crew will actually edit. */

/** Canonical production domain URL and site metadata for SEO and social graph */
export const SITE_URL = 'https://all-nighter.pro.et';
export const SITE_NAME = 'All Nighter';
export const SITE_TAGLINE = 'Doors open at sunset. Lock in till sunrise.';
export const SITE_DESCRIPTION =
	'Show up. Lock in till sunrise. A real-time collaborative focus sanctuary with synchronized music, shared track queue, live presence, and an unbroken countdown to dawn.';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * Replace with your group invite (https://t.me/+<code> or https://t.me/<name>).
 * The site links here from the nav, hero, and closing band.
 */
export const TELEGRAM_URL = 'https://t.me/MrDevEm';

/** Default room code. Anyone opening the site joins this MQTT topic space.
 *  Override per link with ?room=some-code (lowercase letters, numbers, dashes). */
export const DEFAULT_ROOM = 'cafe-404';

/** The 4 solar anchor points of the 24-hour cycle (Ethiopian 6-hour equatorial quadrants):
 *  06:00 Dawn -> 12:00 Midday -> 18:00 Sunset -> 00:00 Midnight */
export const DAWN = { h: 6, m: 0 };
export const MIDDAY = { h: 12, m: 0 };
export const SUNSET = { h: 18, m: 0 };
export const NIGHT_START = { h: 18, m: 0 }; // Sunset doors open: 18:00

export const LS_DAWN = 'an.dawn_time';

/** Load user-configured or default dawn target time. */
export function getDawnTarget(): { h: number; m: number } {
	if (typeof window !== 'undefined') {
		try {
			const saved = localStorage.getItem(LS_DAWN);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (typeof parsed.h === 'number' && typeof parsed.m === 'number') {
					if (parsed.h === 6 && parsed.m === 30) {
						return { ...DAWN };
					}
					return parsed;
				}
			}
		} catch {}
	}
	return { ...DAWN };
}

/**
 * Returns true if doors are open (night session active from sunset 18:00 until morning dawn/sunrise).
 * During daytime (between dawn 06:00 and sunset 18:00), doors are closed and rooms cannot be created.
 */
export function areDoorsOpen(now = new Date()): boolean {
	const dawn = getDawnTarget();
	const h = now.getHours();
	const m = now.getMinutes();

	// Evening: from sunset (18:00) until 23:59:59
	if (h > SUNSET.h || (h === SUNSET.h && m >= SUNSET.m)) {
		return true;
	}
	// Deep night: from midnight (00:00) until morning dawn (default 06:00)
	if (h < dawn.h || (h === dawn.h && m < dawn.m)) {
		return true;
	}
	// Daytime: between dawn and sunset (doors closed)
	return false;
}

/**
 * Returns true if dawn has been reached for the night session
 * (i.e. daytime post-dawn: from dawn until sunset 18:00).
 * Once sunset (18:00) arrives, doors open and the new night session begins.
 */
export function isDawnReached(now = new Date()): boolean {
	return !areDoorsOpen(now);
}

/**
 * Returns the Date of the upcoming sunset (18:00).
 */
export function getNextSunset(now = new Date()): Date {
	const sunset = new Date(now);
	sunset.setHours(SUNSET.h, SUNSET.m, 0, 0);
	if (now.getTime() >= sunset.getTime()) {
		sunset.setDate(sunset.getDate() + 1);
	}
	return sunset;
}

/**
 * Returns the Date of the upcoming dawn/sunrise.
 */
export function getNextDawn(now = new Date()): Date {
	const dawn = getDawnTarget();
	const nextDawn = new Date(now);
	nextDawn.setHours(dawn.h, dawn.m, 0, 0);
	if (now.getTime() >= nextDawn.getTime()) {
		nextDawn.setDate(nextDawn.getDate() + 1);
	}
	return nextDawn;
}

/**
 * Returns true if a room created at `createdAt` has passed its sunrise / dawn.
 * Overnight sessions conclude and archive at sunrise (default 06:00 AM).
 */
export function isRoomPastDawn(createdAt: string | number | Date, now = new Date()): boolean {
	const created = new Date(createdAt);
	const dawn = getDawnTarget();

	// During daytime (between dawn 06:00 and sunset 18:00 doors are closed),
	// any overnight room created before the current time has concluded and passed dawn.
	if (!areDoorsOpen(now) && created.getTime() <= now.getTime()) {
		return true;
	}

	const roomDawn = new Date(created);
	roomDawn.setHours(dawn.h, dawn.m, 0, 0);
	if (created.getTime() >= roomDawn.getTime()) {
		roomDawn.setDate(roomDawn.getDate() + 1);
	}

	return now.getTime() >= roomDawn.getTime();
}

/** Public MQTT brokers (WebSockets, no account). Tried in order at startup.
 *  Verified reachable; swap freely for your own broker. */
export const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];

/** Presence entries older than this are considered gone. */
export const PRESENCE_TTL = 16_000;

/** How often we refresh the presence heartbeat. */
export const PRESENCE_TICK = 5_000;

/** Director (whoever acted last) re-publishes playback state this often while playing. */
export const HEARTBEAT_TICK = 10_000;

/** Drift (seconds) tolerated before we nudge the player back into line. */
export const DRIFT_TOLERANCE = 3.0;

/** Directory ads older than this stop being listed (rooms heartbeat every DIR_TICK). */
export const DIR_TTL = 45_000;

/** How often an occupied room refreshes its directory ad. */
export const DIR_TICK = 15_000;

/** While waiting for approval, re-ask this often (so late-joining members see the request). */
export const REQUEST_TICK = 4_000;

/** Pending join requests older than this are dropped. */
export const REQUEST_TTL = 30_000;
