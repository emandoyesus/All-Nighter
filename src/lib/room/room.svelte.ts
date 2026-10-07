import { BROKERS, DEFAULT_ROOM, PRESENCE_TICK, PRESENCE_TTL } from '#lib/config';
import type { ConnStatus, LogEntry, Peer, RoomState, Track } from './types';

const LS_NAME = 'an.callsign';
const LS_ID = 'an.client';

const ADJ = ['ember', 'night', 'quiet', 'slow', 'warm', 'late', 'dim', 'soft', 'first', 'last'];
const NOUN = ['owl', 'fox', 'kettle', 'radio', 'lamp', 'cloud', 'moth', 'engine', 'monitor', 'match'];

function pick<T>(list: T[]): T {
	return list[Math.floor(Math.random() * list.length)];
}

function randomId(): string {
	try {
		return crypto.randomUUID();
	} catch {
		return 'id-' + Math.random().toString(36).slice(2, 10);
	}
}

function loadOrMake(key: string, fallback: () => string): string {
	try {
		const existing = localStorage.getItem(key);
		if (existing) return existing;
		const made = fallback();
		localStorage.setItem(key, made);
		return made;
	} catch {
		return fallback();
	}
}

export function sanitizeRoom(raw: string | null | undefined): string {
	const value = (raw ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 24);
	return value || DEFAULT_ROOM;
}

function emptyState(): RoomState {
	return {
		seq: 0,
		by: '',
		videoId: null,
		current: null,
		playing: false,
		position: 0,
		clock: 0,
		queue: []
	};
}

type MqttLike = {
	connected: boolean;
	publish(
		topic: string,
		payload: string,
		opts: { retain?: boolean; qos?: 0 | 1 | 2 },
		cb?: (err?: Error) => void
	): unknown;
	subscribe(topics: string | string[]): unknown;
	on(event: string, cb: (...args: any[]) => void): unknown;
	end(force?: boolean): unknown;
};

const TOPIC = 'allnighter/v1';

class Room {
	readonly room: string;
	clientId = '';
	name = $state('');
	status = $state<ConnStatus>('connecting');
	state = $state<RoomState>(emptyState());
	awake = $state<Peer[]>([]);
	log = $state<LogEntry[]>([]);
	/** Estimated remote-minus-local clock skew, milliseconds. */
	offset = $state(0);
	lastRemoteAt = $state(0);

	private client: MqttLike | null = null;
	private peers = new Map<string, Peer>();
	private inited = false;
	private everConnected = false;
	private attempts = 0;
	private offlineSince = 0;
	private lastLocalSeq = 0;

	constructor() {
		const param =
			typeof location !== 'undefined' ? new URLSearchParams(location.search).get('room') : null;
		this.room = sanitizeRoom(param);
	}

	private t(suffix: string): string {
		return `${TOPIC}/${this.room}/${suffix}`;
	}

	private presenceTopic(id: string): string {
		return this.t(`p/${id}`);
	}

	/* ---------------------------------------------------------- lifecycle */

	init(): void {
		if (typeof window === 'undefined' || this.inited) return;
		this.inited = true;

		this.clientId = loadOrMake(LS_ID, randomId);
		this.name = loadOrMake(LS_NAME, () => `${pick(ADJ)}-${pick(NOUN)}-${Math.floor(Math.random() * 90 + 10)}`);

		this.peers.set(this.clientId, { id: this.clientId, name: this.name, ts: Date.now(), self: true });
		this.flushPeers();

		void this.connect();
		window.setInterval(() => this.announce(), PRESENCE_TICK);
		window.setInterval(() => this.tick(), 1000);
		window.addEventListener('beforeunload', this.bye);
	}

	private bye = (): void => {
		if (!this.clientId) return;
		this.pub(this.presenceTopic(this.clientId), '', true);
	};

	private async connect(): Promise<void> {
		let mqtt: typeof import('mqtt');
		try {
			mqtt = await import('mqtt');
		} catch {
			this.status = 'solo';
			return;
		}

		const tryBroker = (index: number): void => {
			if (this.everConnected && this.client?.connected) return;
			const url = BROKERS[index % BROKERS.length];
			let settled = false;

			const client = mqtt.connect(url, {
				reconnectPeriod: 4000,
				connectTimeout: 5000,
				clean: true,
				will: {
					topic: this.presenceTopic(this.clientId),
					payload: '',
					retain: true,
					qos: 0
				}
			}) as MqttLike;
			this.client = client;

			const failTimer = window.setTimeout(() => {
				if (settled) return;
				settled = true;
				this.attempts += 1;
				try {
					client.end(true);
				} catch {
					/* ignore */
				}
				if (this.attempts >= BROKERS.length * 2) {
					this.status = 'solo';
					window.setTimeout(() => {
						if (!this.everConnected) {
							this.attempts = 0;
							tryBroker(index + 1);
						}
					}, 25_000);
				} else {
					tryBroker(index + 1);
				}
			}, 5500);

			client.on('connect', () => {
				settled = true;
				window.clearTimeout(failTimer);
				this.everConnected = true;
				this.attempts = 0;
				this.offlineSince = 0;
				this.status = 'online';
				client.subscribe([this.t('state'), this.t('p/#'), this.t('log')]);
				this.announce();
				if (this.state.by === this.clientId) this.publishState();
			});

			client.on('message', (topic: string, payload: Uint8Array | string) =>
				this.onMessage(topic, payload)
			);

			client.on('close', () => this.markOffline());
			client.on('offline', () => this.markOffline());
			client.on('error', () => {
				/* close handles it */
			});
		};

		tryBroker(0);
	}

	private markOffline(): void {
		if (!this.everConnected) return;
		if (!this.offlineSince) this.offlineSince = Date.now();
		this.status = 'connecting';
	}

	/* ----------------------------------------------------------- messages */

	private onMessage(topic: string, raw: Uint8Array | string): void {
		const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
		if (topic.startsWith(this.t('p/'))) {
			this.onPresence(topic.slice(this.t('p/').length), text);
			return;
		}
		if (topic === this.t('state')) {
			if (!text) return;
			try {
				this.accept(JSON.parse(text));
			} catch {
				/* ignore malformed */
			}
			return;
		}
		if (topic === this.t('log')) {
			if (!text) return;
			try {
				this.onLog(JSON.parse(text));
			} catch {
				/* ignore malformed */
			}
		}
	}

	private onPresence(id: string, text: string): void {
		if (id === this.clientId) return;
		if (!text) {
			this.peers.delete(id);
			this.flushPeers();
			return;
		}
		try {
			const data = JSON.parse(text) as { name?: string; ts?: number };
			if (!data?.name) return;
			this.peers.set(id, { id, name: String(data.name).slice(0, 24), ts: Number(data.ts) || 0 });
			this.flushPeers();
		} catch {
			/* ignore */
		}
	}

	private accept(msg: Partial<RoomState> & { clock?: number }): void {
		if (!msg || typeof msg.seq !== 'number') return;
		if (msg.by === this.clientId) return;

		const now = Date.now();
		const incomingSeq = msg.seq;
		const incomingBy = msg.by ?? '';
		const newer =
			incomingSeq > this.state.seq ||
			(incomingSeq === this.state.seq && incomingBy > this.state.by);
		const directorHeartbeat = incomingBy === this.state.by && Number(msg.clock) > this.state.clock;
		if (!newer && !directorHeartbeat) return;

		this.offset = Number(msg.clock) - now;
		this.lastRemoteAt = now;
		this.state = {
			seq: incomingSeq,
			by: incomingBy,
			videoId: msg.videoId ?? null,
			current: msg.current ?? null,
			playing: !!msg.playing,
			position: Number(msg.position) || 0,
			clock: Number(msg.clock) || now,
			queue: Array.isArray(msg.queue) ? msg.queue : []
		};
	}

	private onLog(entry: LogEntry): void {
		if (!entry?.id || this.log.some((item) => item.id === entry.id)) return;
		this.log = [{ ...entry, ts: entry.ts || Date.now() }, ...this.log].slice(0, 7);
	}

	/* ------------------------------------------------------------- publish */

	private pub(topic: string, payload: string, retain = false): void {
		if (!this.client?.connected) return;
		try {
			this.client.publish(topic, payload, { retain, qos: 0 });
		} catch {
			/* offline, next action will retry */
		}
	}

	private publishState(): void {
		this.pub(this.t('state'), JSON.stringify({ ...this.state, clock: Date.now() }), true);
	}

	private writeLog(text: string): void {
		const entry: LogEntry = { id: randomId(), who: this.name, text, ts: Date.now() };
		this.pub(this.t('log'), JSON.stringify(entry));
		this.onLog(entry);
	}

	/** Bump a local action into shared truth. */
	private mutate(
		next: (s: RoomState) => RoomState,
		logText?: string,
		options?: { keepSeq?: boolean }
	): void {
		const clock = Date.now();
		const base = next(this.state);
		const seq = options?.keepSeq ? this.state.seq || clock : clock;
		this.state = { ...base, seq, by: this.clientId, clock };
		if (!options?.keepSeq) this.lastLocalSeq = seq;
		this.publishState();
		if (logText) this.writeLog(logText);
	}

	/* -------------------------------------------------------------- actions */

	announce(): void {
		if (!this.clientId) return;
		this.peers.set(this.clientId, { id: this.clientId, name: this.name, ts: Date.now(), self: true });
		this.flushPeers();
		this.pub(
			this.presenceTopic(this.clientId),
			JSON.stringify({ name: this.name, ts: Date.now() }),
			true
		);
	}

	setName(value: string): void {
		const cleaned = value.slice(0, 24);
		this.name = cleaned;
		try {
			localStorage.setItem(LS_NAME, cleaned);
		} catch {
			/* private mode */
		}
		this.announce();
	}

	add(videoId: string, title: string, channel: string | undefined, addedBy: string): void {
		const track: Track = { uid: randomId(), videoId, title, channel, addedBy };
		this.mutate((s) => ({ ...s, queue: [...s.queue, track] }), `added “${title}”`);
	}

	remove(uid: string): void {
		this.mutate(
			(s) => ({ ...s, queue: s.queue.filter((item) => item.uid !== uid) }),
			'took a track off the queue'
		);
	}

	playNow(track: Track): void {
		this.mutate(
			(s) => ({
				...s,
				current: track,
				videoId: track.videoId,
				playing: true,
				position: 0,
				queue: s.queue.filter((item) => item.uid !== track.uid)
			}),
			`put “${track.title}” on`
		);
	}

	toggle(position: number): void {
		this.mutate((s) => ({ ...s, playing: !s.playing, position }));
	}

	seekTo(position: number): void {
		this.mutate((s) => ({ ...s, position }));
	}

	skip(): void {
		const finished = this.state.current?.title;
		this.mutate(
			(s) => {
				const [next, ...rest] = s.queue;
				return {
					...s,
					queue: rest,
					current: next ?? null,
					videoId: next?.videoId ?? null,
					playing: !!next,
					position: 0
				};
			},
			finished ? `skipped “${finished}”` : 'skipped ahead'
		);
	}

	/** The video ended on its own: advance, or settle into the empty state.
	 *  `watchId` is the video the caller watched; if the room already moved on, do nothing
	 *  (every client's player ends at roughly the same moment, only the first advances). */
	ended(watchId: string | null): void {
		if (watchId && this.state.videoId !== watchId) return;
		if (!this.state.playing) return;
		const finished = this.state.current?.title;
		this.mutate((s) => {
			const [next, ...rest] = s.queue;
			return {
				...s,
				queue: rest,
				current: next ?? null,
				videoId: next?.videoId ?? null,
				playing: !!next,
				position: 0
			};
		});
		if (finished) this.writeLog(`finished “${finished}”`);
	}

	/** Director heartbeat: refresh clock + position without changing seq. */
	heartbeat(position: number): void {
		this.mutate((s) => ({ ...s, position }), undefined, { keepSeq: true });
	}

	/** Take over playback authority after the last director went quiet. */
	claim(position: number): void {
		this.mutate((s) => ({ ...s, position, playing: true }));
	}

	isDirector(): boolean {
		return this.state.by === this.clientId;
	}

	roomUrl(): string {
		if (typeof location === 'undefined') return '';
		return `${location.origin}${location.pathname}?room=${this.room}`;
	}

	/* ------------------------------------------------------------- housekeeping */

	private tick(): void {
		const now = Date.now();
		for (const [id, peer] of this.peers) {
			if (id !== this.clientId && now - peer.ts > PRESENCE_TTL) this.peers.delete(id);
		}
		this.flushPeers();
		if (this.status === 'connecting' && this.offlineSince && now - this.offlineSince > 12_000) {
			this.status = 'solo';
		}
	}

	private flushPeers(): void {
		const list = [...this.peers.values()].sort(
			(a, b) => Number(!!b.self) - Number(!!a.self) || a.name.localeCompare(b.name)
		);
		this.awake = list;
	}
}

export const room = new Room();
