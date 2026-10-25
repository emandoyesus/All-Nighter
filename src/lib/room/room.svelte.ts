import {
	BROKERS,
	DIR_TICK,
	DIR_TTL,
	DEFAULT_ROOM,
	PRESENCE_TICK,
	PRESENCE_TTL,
	REQUEST_TICK,
	REQUEST_TTL
} from '#lib/config';
import type {
	ChatMessage,
	ConnStatus,
	JoinRequest,
	JoinState,
	LogEntry,
	Peer,
	RoomAd,
	RoomState,
	Track,
	TrackSource
} from './types';

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

export function parseTrackUrl(url: string): { source: 'youtube' | 'spotify' | 'soundcloud' | null; id: string | null } {
	const input = url.trim();
	if (!input) return { source: null, id: null };
	try {
		const u = new URL(input);
		const host = u.hostname.replace('www.', '');
		if (host === 'youtu.be') {
			return { source: 'youtube', id: u.pathname.replace('/', '') };
		}
		if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
			if (u.pathname === '/watch') {
				return { source: 'youtube', id: u.searchParams.get('v') };
			}
			if (u.pathname.startsWith('/shorts/')) {
				return { source: 'youtube', id: u.pathname.split('/')[2] ?? null };
			}
			if (u.pathname.startsWith('/live/')) {
				return { source: 'youtube', id: u.pathname.split('/')[2] ?? null };
			}
		}
		if (host === 'open.spotify.com') {
			const parts = u.pathname.split('/').filter(Boolean);
			if (parts.length >= 2 && (parts[0] === 'track' || parts[0] === 'album' || parts[0] === 'playlist')) {
				return { source: 'spotify', id: parts[1] };
			}
		}
		if (host === 'soundcloud.com') {
			return { source: 'soundcloud', id: u.pathname.replace(/^\//, '') };
		}
	} catch {
		// maybe just an id
	}
	return { source: null, id: null };
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
		source: 'youtube',
		current: null,
		playing: false,
		position: 0,
		clock: 0,
		queue: [],
		chat: []
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
	unsubscribe(topics: string | string[]): unknown;
	on(event: string, cb: (...args: any[]) => void): unknown;
	end(force?: boolean): unknown;
};

const TOPIC = 'allnighter/v1';

class Room {
	/** Active room slug. Empty while browsing the lobby. */
	room = $state('');
	clientId = '';
	name = $state('');
	statusText = $state('');
	status = $state<ConnStatus>('connecting');
	state = $state<RoomState>(emptyState());
	awake = $state<Peer[]>([]);
	log = $state<LogEntry[]>([]);
	/** Estimated remote-minus-local clock skew, milliseconds. */
	offset = $state(0);
	lastRemoteAt = $state(0);

	/** Room lifecycle. */
	joinState = $state<JoinState>('lobby');
	title = $state('');
	isHost = $state(false);
	/** Current room mode: 'focus' (chat quiet, calm queue) or 'break' (aux open). */
	mode = $state<'focus' | 'break'>('focus');
	/** This user's one-line intention for the night. */
	intention = $state('');
	/** Rooms advertised on the broker right now. */
	directory = $state<RoomAd[]>([]);
	/** People asking to be let in (only populated for members). */
	pending = $state<JoinRequest[]>([]);
	/** Client IDs that voted to skip current track. */
	skipVoters = $state<string[]>([]);

	private client: MqttLike | null = null;
	private peers = new Map<string, Peer>();
	private inited = false;
	private everConnected = false;
	private attempts = 0;
	private offlineSince = 0;
	private requestTimer = 0;
	private dirTimer = 0;

	/* ------------------------------------------------------------- topics */

	private t(suffix: string): string {
		return `${TOPIC}/${this.room}/${suffix}`;
	}

	private dirTopic(room: string): string {
		return `${TOPIC}/dir/${room}`;
	}

	private joinTopic(room: string, id: string): string {
		return `${TOPIC}/${room}/join/${id}`;
	}

	private decTopic(room: string, id: string): string {
		return `${TOPIC}/${room}/dec/${id}`;
	}

	private presenceTopic(room: string, id: string): string {
		return `${TOPIC}/${room}/p/${id}`;
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

		const param =
			typeof location !== 'undefined' ? new URLSearchParams(location.search).get('room') : null;
		if (param) {
			const slug = sanitizeRoom(param);
			let wasHost = false;
			try {
				wasHost = localStorage.getItem('an.host.' + slug) === '1';
			} catch {
				/* ignore */
			}
			if (wasHost) {
				this.enterApproved(slug, slug, true);
			} else {
				this.requestJoin(slug);
			}
		}
	}

	private bye = (): void => {
		if (!this.clientId) return;
		if (this.room && this.joinState === 'approved') {
			this.pub(this.presenceTopic(this.room, this.clientId), '', true);
		}
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
					topic: this.presenceTopic(this.room || DEFAULT_ROOM, this.clientId),
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
				client.subscribe(`${TOPIC}/dir/#`);
				if (this.room && this.joinState === 'approved') {
					this.subscribeActive();
					this.announce();
					if (this.isHost) this.publishState();
					this.updateAd();
				} else if (this.room && this.joinState === 'waiting') {
					this.subscribeActive();
					this.publishRequest();
				}
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
		if (!topic.startsWith(`${TOPIC}/`)) return;
		const rel = topic.slice(TOPIC.length + 1);

		if (rel.startsWith('dir/')) {
			this.onDir(rel.slice(4), text);
			return;
		}

		const slash = rel.indexOf('/');
		if (slash < 0) return;
		const slug = rel.slice(0, slash);
		const rest = rel.slice(slash + 1);
		if (slug !== this.room) return;

		if (rest === 'state') {
			if (!text) return;
			try {
				this.accept(JSON.parse(text));
			} catch {
				/* ignore malformed */
			}
			return;
		}
		if (rest === 'log') {
			if (!text) return;
			try {
				this.onLog(JSON.parse(text));
			} catch {
				/* ignore malformed */
			}
			return;
		}
		if (rest === 'chat') {
			if (!text) return;
			try {
				this.onChat(JSON.parse(text));
			} catch {
				/* ignore malformed */
			}
			return;
		}
		if (rest.startsWith('p/')) {
			this.onPresence(rest.slice(2), text);
			return;
		}
		if (rest.startsWith('join/')) {
			this.onJoinRequest(rest.slice(5), text);
			return;
		}
		if (rest.startsWith('dec/')) {
			if (rest.slice(4) === this.clientId) this.onDecision(text);
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
			const data = JSON.parse(text) as { name?: string; ts?: number; status?: string; intention?: string };
			if (!data?.name) return;
			this.peers.set(id, {
				id,
				name: String(data.name).slice(0, 24),
				status: data.status ? String(data.status).slice(0, 24) : undefined,
				intention: data.intention ? String(data.intention).slice(0, 80) : undefined,
				ts: Number(data.ts) || 0
			});
			this.flushPeers();
		} catch {
			/* ignore */
		}
	}

	private onDir(slug: string, text: string): void {
		const room = sanitizeRoom(slug);
		if (!text) {
			this.directory = this.directory.filter((entry) => entry.room !== room);
			return;
		}
		try {
			const ad = JSON.parse(text) as RoomAd;
			if (!ad?.room) return;
			const entry: RoomAd = {
				room: sanitizeRoom(ad.room),
				title: String(ad.title ?? ad.room).slice(0, 40),
				host: String(ad.host ?? '').slice(0, 24),
				members: Math.max(0, Number(ad.members) || 0),
				ts: Number(ad.ts) || 0
			};
			this.directory = [...this.directory.filter((item) => item.room !== entry.room), entry];
		} catch {
			/* ignore malformed */
		}
	}

	private onJoinRequest(id: string, text: string): void {
		if (this.joinState !== 'approved') return;
		if (id === this.clientId) return;
		if (!text) {
			this.pending = this.pending.filter((req) => req.id !== id);
			return;
		}
		try {
			const data = JSON.parse(text) as { name?: string; ts?: number };
			if (!data?.name) return;
			const ts = Number(data.ts) || Date.now();
			if (Date.now() - ts > REQUEST_TTL) return;
			const existing = this.pending.find((req) => req.id === id);
			if (existing) {
				this.pending = this.pending.map((req) => (req.id === id ? { ...req, ts } : req));
			} else {
				this.pending = [...this.pending, { id, name: String(data.name).slice(0, 24), ts }];
			}
		} catch {
			/* ignore */
		}
	}

	private onDecision(text: string): void {
		try {
			const data = JSON.parse(text) as { ok?: boolean };
			if (data?.ok) {
				this.admit();
			} else if (this.joinState !== 'approved') {
				this.stopRequesting();
				this.joinState = 'rejected';
			}
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
			source: msg.source,
			current: msg.current ?? null,
			playing: !!msg.playing,
			position: Number(msg.position) || 0,
			clock: Number(msg.clock) || now,
			queue: Array.isArray(msg.queue) ? msg.queue : [],
			chat: this.state.chat ?? []
		};
	}

	private onLog(entry: LogEntry): void {
		if (!entry?.id || this.log.some((item) => item.id === entry.id)) return;
		this.log = [{ ...entry, ts: entry.ts || Date.now() }, ...this.log].slice(0, 7);
	}

	private onChat(msg: ChatMessage): void {
		if (!msg?.id) return;
		const chat = this.state.chat || [];
		if (chat.some((item) => item.id === msg.id)) return;
		this.state = { ...this.state, chat: [...chat, msg].slice(-100) };
	}

	sendChat(text: string): void {
		const trimmed = text.trim().slice(0, 280);
		if (!trimmed || this.joinState !== 'approved') return;
		const msg: ChatMessage = { id: randomId(), who: this.name, whoId: this.clientId, text: trimmed, ts: Date.now() };
		this.pub(this.t('chat'), JSON.stringify(msg));
		this.onChat(msg);
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
		if (!this.room) return;
		const { chat: _chat, ...shared } = this.state;
		this.pub(this.t('state'), JSON.stringify({ ...shared, clock: Date.now() }), true);
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
		this.publishState();
		if (logText) this.writeLog(logText);
	}

	/* --------------------------------------------------------- room lifecycle */

	private subscribeActive(): void {
		if (!this.client?.connected || !this.room) return;
		this.client.subscribe([
			this.t('state'),
			this.t('p/#'),
			this.t('log'),
			this.t('chat'),
			this.t('join/#'),
			this.decTopic(this.room, this.clientId)
		]);
	}

	/** Create a room and step inside as its host. */
	createRoom(name: string): void {
		const slug = sanitizeRoom(name);
		this.enterApproved(slug, name.trim() || slug, true);
	}

	/** Claim an unhosted or deserted room and step inside as host. */
	claimRoom(slug: string, title?: string): void {
		const clean = sanitizeRoom(slug);
		this.enterApproved(clean, title?.trim() || clean, true);
	}

	/** Ask the members of `slug` to let us in. */
	requestJoin(slug: string, title?: string): void {
		const clean = sanitizeRoom(slug);
		this.resetRoom();
		this.room = clean;
		this.title = title?.trim() || clean;
		this.joinState = 'waiting';
		this.syncUrl(clean);
		this.subscribeActive();
		this.publishRequest();
		this.startRequesting();
	}

	private publishRequest(): void {
		if (!this.room) return;
		this.pub(
			this.joinTopic(this.room, this.clientId),
			JSON.stringify({ name: this.name, ts: Date.now() }),
			true
		);
	}

	private startRequesting(): void {
		this.stopRequesting();
		this.requestTimer = window.setInterval(() => {
			if (this.joinState !== 'waiting') {
				this.stopRequesting();
				return;
			}
			this.publishRequest();
		}, REQUEST_TICK);
	}

	private stopRequesting(): void {
		if (this.requestTimer) {
			window.clearInterval(this.requestTimer);
			this.requestTimer = 0;
		}
	}

	/** A member accepted us (or a retained approval arrived). */
	private admit(): void {
		if (this.joinState === 'approved') return;
		this.stopRequesting();
		this.joinState = 'approved';
		this.syncUrl(this.room);
		this.subscribeActive();
		this.announce();
		this.publishState();
		this.startDirectory();
	}

	private enterApproved(slug: string, title: string, host: boolean): void {
		this.resetRoom();
		this.room = slug;
		this.title = title;
		this.isHost = host;
		this.joinState = 'approved';
		if (host) {
			try {
				localStorage.setItem('an.host.' + slug, '1');
			} catch {
				/* ignore */
			}
		}
		this.syncUrl(slug);
		this.subscribeActive();
		this.announce();
		this.publishState();
		this.startDirectory();
	}

	approve(id: string): void {
		if (!this.room) return;
		this.pub(
			this.decTopic(this.room, id),
			JSON.stringify({ ok: true, by: this.name, ts: Date.now() }),
			true
		);
		this.pending = this.pending.filter((req) => req.id !== id);
	}

	reject(id: string): void {
		if (!this.room) return;
		this.pub(this.decTopic(this.room, id), JSON.stringify({ ok: false, by: this.name, ts: Date.now() }), false);
		this.pending = this.pending.filter((req) => req.id !== id);
	}

	/** Leave the room and return to the lobby. */
	leave(): void {
		if (this.room && this.joinState === 'approved') {
			this.pub(this.presenceTopic(this.room, this.clientId), '', true);
			if (this.isHost) this.pub(this.dirTopic(this.room), '', true);
		}
		if (this.room) {
			try {
				localStorage.removeItem('an.host.' + this.room);
			} catch {
				/* ignore */
			}
		}
		this.resetRoom();
		this.joinState = 'lobby';
		this.syncUrl('');
	}

	private syncUrl(slug: string): void {
		if (typeof window === 'undefined' || typeof history === 'undefined') return;
		try {
			const url = new URL(window.location.href);
			if (slug) {
				url.searchParams.set('room', slug);
			} else {
				url.searchParams.delete('room');
			}
			window.history.replaceState({}, '', url.toString());
		} catch {
			/* ignore */
		}
	}

	/* --------------------------------------------------------- directory ad */

	private startDirectory(): void {
		this.stopDirectory();
		this.updateAd();
		this.dirTimer = window.setInterval(() => {
			if (this.joinState !== 'approved' || !this.room) {
				this.stopDirectory();
				return;
			}
			this.updateAd();
		}, DIR_TICK);
	}

	private stopDirectory(): void {
		if (this.dirTimer) {
			window.clearInterval(this.dirTimer);
			this.dirTimer = 0;
		}
	}

	private updateAd(): void {
		if (!this.room || this.joinState !== 'approved') return;
		this.pub(
			this.dirTopic(this.room),
			JSON.stringify({
				room: this.room,
				title: this.title || this.room,
				host: this.isHost ? this.name : this.hostName(),
				members: this.awake.length,
				ts: Date.now()
			} satisfies RoomAd),
			true
		);
	}

	/** Keep the original host name when other members refresh the ad. */
	private hostName(): string {
		return this.directory.find((entry) => entry.room === this.room)?.host || this.name;
	}

	/* -------------------------------------------------------------- actions */

	announce(): void {
		if (!this.clientId || this.joinState !== 'approved' || !this.room) return;
		this.peers.set(this.clientId, {
			id: this.clientId,
			name: this.name,
			status: this.statusText || undefined,
			intention: this.intention || undefined,
			ts: Date.now(),
			self: true
		});
		this.flushPeers();
		this.pub(
			this.presenceTopic(this.room, this.clientId),
			JSON.stringify({ name: this.name, status: this.statusText || undefined, intention: this.intention || undefined, ts: Date.now() }),
			true
		);
		this.updateAd();
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

	setStatus(value: string): void {
		const cleaned = value.slice(0, 24);
		this.statusText = cleaned;
		this.announce();
		if (cleaned) {
			this.writeLog(`is now ${cleaned}`);
		}
	}

	setIntention(value: string): void {
		this.intention = value.slice(0, 80);
		this.announce();
	}

	setMode(next: 'focus' | 'break'): void {
		if (this.mode === next) return;
		this.mode = next;
		const label = next === 'focus' ? '🎯 focus mode' : '🔓 break mode';
		this.writeLog(`switched the room to ${label}`);
	}

	add(
		videoIdOrUrl: string | null,
		title: string,
		channel: string | undefined,
		addedBy: string,
		source?: TrackSource,
		url?: string,
		dedication?: string,
		tag?: 'focus' | 'hangout'
	): void {
		const raw = videoIdOrUrl ?? '';
		const parsed = source ? null : parseTrackUrl(raw);
		const trackSource = source ?? parsed?.source ?? (raw.includes('youtube.com') || raw.includes('youtu.be') ? 'youtube' : 'unknown');
		const videoId = trackSource === 'youtube' ? (parsed?.id ?? raw ?? null) : null;
		const trackUrl = url ?? raw;
		const track: Track = {
			uid: randomId(),
			videoId,
			source: trackSource,
			url: trackUrl,
			title,
			channel,
			addedBy,
			addedById: this.clientId,
			votes: 0,
			voters: [],
			reactions: {},
			dedication: dedication?.trim() ? dedication.trim().slice(0, 80) : undefined,
			tag
		};
		this.mutate((s) => {
			const queue = [...s.queue, track];
			// simple sort by votes desc then by added order (keep original index for ties)
			queue.sort((a, b) => (b.votes || 0) - (a.votes || 0));
			return { ...s, queue };
		}, `added “${title}”` + (track.dedication ? ` (dedicated: “${track.dedication}”)` : ''));
	}

	vote(uid: string): void {
		this.mutate((s) => {
			const queue = s.queue.map((t) => {
				if (t.uid !== uid) return t;
				const voters = t.voters || [];
				if (voters.includes(this.clientId)) {
					return { ...t, votes: Math.max(0, (t.votes || 0) - 1), voters: voters.filter((v) => v !== this.clientId) };
				}
				return { ...t, votes: (t.votes || 0) + 1, voters: [...voters, this.clientId] };
			});
			queue.sort((a, b) => (b.votes || 0) - (a.votes || 0));
			return { ...s, queue };
		});
	}

	react(uid: string, emoji: string): void {
		const toggle = (track: Track): Track => {
			if (track.uid !== uid) return track;
			const reactions = { ...(track.reactions || {}) };
			const list = reactions[emoji] || [];
			if (list.includes(this.clientId)) {
				reactions[emoji] = list.filter((v) => v !== this.clientId);
				if (reactions[emoji].length === 0) delete reactions[emoji];
			} else {
				reactions[emoji] = [...list, this.clientId];
			}
			return { ...track, reactions };
		};
		this.mutate((s) => ({
			...s,
			current: s.current ? toggle(s.current) : null,
			queue: s.queue.map(toggle)
		}));
	}

	remove(uid: string): void {
		this.mutate(
			(s) => ({ ...s, queue: s.queue.filter((item) => item.uid !== uid) }),
			'took a track off the queue'
		);
	}

	moveQueue(fromIndex: number, toIndex: number): void {
		if (fromIndex < 0 || fromIndex >= this.state.queue.length) return;
		if (toIndex < 0 || toIndex >= this.state.queue.length) return;
		if (fromIndex === toIndex) return;
		this.mutate((s) => {
			const q = [...s.queue];
			const [item] = q.splice(fromIndex, 1);
			q.splice(toIndex, 0, item);
			return { ...s, queue: q };
		});
	}

	playNow(track: Track): void {
		this.mutate(
			(s) => {
				const queue = s.queue.filter((item) => item.uid !== track.uid);
				queue.sort((a, b) => (b.votes || 0) - (a.votes || 0));
				return {
					...s,
					current: track,
					videoId: track.videoId,
					source: track.source,
					playing: true,
					position: 0,
					queue
				};
			},
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
		this.skipVoters = [];
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

	skipVote(): void {
		if (this.isHost) {
			this.skip();
			return;
		}
		if (this.skipVoters.includes(this.clientId)) {
			this.skipVoters = this.skipVoters.filter((id) => id !== this.clientId);
		} else {
			this.skipVoters = [...this.skipVoters, this.clientId];
		}
		const needed = Math.max(1, Math.ceil(this.awake.length / 2));
		if (this.skipVoters.length >= needed) {
			this.writeLog(`voted to skip (${this.skipVoters.length}/${needed}) — advancing`);
			this.skip();
		}
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
		return `${location.origin}${location.pathname}${this.room ? `?room=${this.room}` : ''}`;
	}

	inviteUrl(slug: string): string {
		if (typeof location === 'undefined') return '';
		return `${location.origin}${location.pathname}?room=${sanitizeRoom(slug)}`;
	}

	/* --------------------------------------------------------- housekeeping */

	private tick(): void {
		const now = Date.now();
		for (const [id, peer] of this.peers) {
			if (id !== this.clientId && now - peer.ts > PRESENCE_TTL) this.peers.delete(id);
		}
		this.flushPeers();

		if (this.pending.length) {
			const present = new Set(this.awake.map((peer) => peer.id));
			this.pending = this.pending.filter(
				(req) => now - req.ts <= REQUEST_TTL && !present.has(req.id)
			);
		}

		const live = this.directory.filter((entry) => now - entry.ts <= DIR_TTL);
		if (live.length !== this.directory.length) this.directory = live;

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

	private resetRoom(): void {
		this.stopRequesting();
		this.stopDirectory();
		this.peers.clear();
		if (this.clientId) {
			this.peers.set(this.clientId, { id: this.clientId, name: this.name, ts: Date.now(), self: true });
		}
		this.flushPeers();
		this.room = '';
		this.title = '';
		this.isHost = false;
		this.state = emptyState();
		this.log = [];
		this.pending = [];
	}
}

export const room = new Room();
