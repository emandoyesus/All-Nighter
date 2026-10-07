/** Site-wide knobs your crew will actually edit. */

/**
 * Replace with your group invite (https://t.me/+<code> or https://t.me/<name>).
 * The site links here from the nav, hero, and closing band.
 */
export const TELEGRAM_URL = 'https://t.me/';

/** Default room code. Anyone opening the site joins this MQTT topic space.
 *  Override per link with ?room=some-code (lowercase letters, numbers, dashes). */
export const DEFAULT_ROOM = 'cafe-404';

/** The countdown ticks toward this local wall-clock time each morning. */
export const DAWN = { h: 6, m: 30 };

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
