export type Track = {
	uid: string;
	videoId: string;
	title: string;
	channel?: string;
	addedBy: string;
};

/** Shared playback truth. LWW by `seq` (wall clock), tie-broken by `by`.
 *  `position` is the playback time (seconds) at the moment `clock` was true. */
export type RoomState = {
	seq: number;
	by: string;
	videoId: string | null;
	current: Track | null;
	playing: boolean;
	position: number;
	clock: number;
	queue: Track[];
};

export type Peer = { id: string; name: string; ts: number; self?: boolean };

export type LogEntry = { id: string; who: string; text: string; ts: number };

export type ConnStatus = 'connecting' | 'online' | 'solo';
