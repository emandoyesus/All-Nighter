export type TrackSource = 'youtube' | 'spotify' | 'soundcloud' | 'unknown';

export type Track = {
	uid: string;
	videoId: string | null;
	source: TrackSource;
	url?: string;
	title: string;
	channel?: string;
	addedBy: string;
	addedById?: string;
	votes?: number;
	voters?: string[];
	reactions?: Record<string, string[]>; // emoji -> list of user ids/names
	dedication?: string;
	tag?: 'focus' | 'hangout';
};

export type ChatMessage = {
	id: string;
	who: string;
	whoId?: string;
	text: string;
	ts: number;
};

/** Shared playback truth. LWW by `seq` (wall clock), tie-broken by `by`.
 *  `position` is the playback time (seconds) at the moment `clock` was true. */
export type RoomState = {
	seq: number;
	by: string;
	videoId: string | null;
	source?: TrackSource;
	current: Track | null;
	playing: boolean;
	position: number;
	clock: number;
	queue: Track[];
	chat?: ChatMessage[];
	mode?: 'focus' | 'break';
	modeExpiresAt?: number;
	cycleAuto?: boolean;
	doorLocked?: boolean;
};

export type Peer = {
	id: string;
	name: string;
	ts: number;
	self?: boolean;
	status?: string;
	intention?: string;
	tz?: string;
};

export type LogEntry = { id: string; who: string; text: string; ts: number };

export type ConnStatus = 'connecting' | 'online' | 'solo';

/** A joinable room advertised on the public directory topic. */
export type RoomAd = {
	room: string;
	title: string;
	host: string;
	members: number;
	ts: number;
};

/** A pending "let me in" ticket from someone outside the room. */
export type JoinRequest = {
	id: string;
	name: string;
	ts: number;
};

/** Where the visitor is in the door flow. */
export type JoinState = 'lobby' | 'requesting' | 'waiting' | 'approved' | 'rejected';
