/** Site-wide knobs your crew will actually edit. */

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
export const NIGHT_START = { h: 0, m: 0 }; // Midnight lock-in start

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
 * Returns true if dawn has been reached for the night session
 * (i.e. daytime post-dawn: from dawn until midnight).
 * Between 00:00 (midnight) and dawn (default 06:00), the session is active night.
 */
export function isDawnReached(now = new Date()): boolean {
	const dawn = getDawnTarget();
	const isNightLockIn =
		now.getHours() >= 0 &&
		(now.getHours() < dawn.h || (now.getHours() === dawn.h && now.getMinutes() < dawn.m));

	return !isNightLockIn;
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
export const DRIFT_TOLERANCE = 1.5;

/** Directory ads older than this stop being listed (rooms heartbeat every DIR_TICK). */
export const DIR_TTL = 45_000;

/** How often an occupied room refreshes its directory ad. */
export const DIR_TICK = 15_000;

/** While waiting for approval, re-ask this often (so late-joining members see the request). */
export const REQUEST_TICK = 4_000;

/** Pending join requests older than this are dropped. */
export const REQUEST_TTL = 30_000;
