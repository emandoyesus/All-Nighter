import {
	BROKERS,
	DIR_TICK,
	DIR_TTL,
	DEFAULT_ROOM,
	PRESENCE_TICK,
	PRESENCE_TTL,
	REQUEST_TICK,
	REQUEST_TTL,
	areDoorsOpen,
	isDawnReached,
	isRoomPastDawn
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
import { playFocusChime, playBreakChime, playDawnChime } from '#lib/audio/chime';
import { goto } from '$app/navigation';
import { SupabaseRoomSync } from './supabase-sync';
import { auth, extractGoogleFirstName } from '#lib/auth.svelte';
import { supabase, isSupabaseConfigured } from '#lib/supabase';
import { buildNightFromRoom, saveToMyNights } from '#lib/data/local-logbook';
import type { Night } from '#lib/data/archive';
import { recordStat } from '#lib/data/profile-stats';
import { getRelatedTrackSync, getRelatedYouTubeTrack, isBannedMusic, detectMusicLanguage } from './youtube';

const LS_NAME = 'an.callsign';
const LS_ID = 'an.client';
const LS_AVATAR = 'an.avatar';
const LS_ACTIVE_ROOM = 'an.active_room';
const LS_ACTIVE_TITLE = 'an.active_title';

function randomId(): string {
	try {
		return crypto.randomUUID();
	} catch {
		return 'id-' + Math.random().toString(36).slice(2, 10);
	}
}

export function parseTrackUrl(url: string): {
	source: 'youtube' | 'spotify' | 'soundcloud' | null;
	id: string | null;
	playlistId?: string | null;
	isPlaylist?: boolean;
} {
	const input = url.trim();
	if (!input) return { source: null, id: null };
	try {
		const u = new URL(input);
		const host = u.hostname.replace('www.', '');

		if (host === 'youtu.be') {
			const id = u.pathname.replace('/', '');
			const list = u.searchParams.get('list');
			return {
				source: 'youtube',
				id: id || null,
				playlistId: list,
				isPlaylist: !!list
			};
		}
		if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
			const list = u.searchParams.get('list');
			if (u.pathname === '/playlist') {
				return {
					source: 'youtube',
					id: null,
					playlistId: list,
					isPlaylist: true
				};
			}
			if (u.pathname === '/watch') {
				return {
					source: 'youtube',
					id: u.searchParams.get('v'),
					playlistId: list,
					isPlaylist: !!list
				};
			}
			if (u.pathname.startsWith('/shorts/')) {
				return { source: 'youtube', id: u.pathname.split('/')[2] ?? null };
			}
			if (u.pathname.startsWith('/live/')) {
				return { source: 'youtube', id: u.pathname.split('/')[2] ?? null };
			}
			if (list) {
				return {
					source: 'youtube',
					id: u.searchParams.get('v'),
					playlistId: list,
					isPlaylist: true
				};
			}
		}
		if (host === 'open.spotify.com') {
			const parts = u.pathname.split('/').filter(Boolean);
			if (parts.length >= 2) {
				const type = parts[0];
				const id = parts[1];
				if (type === 'playlist' || type === 'album') {
					return {
						source: 'spotify',
						id,
						playlistId: id,
						isPlaylist: true
					};
				}
				if (type === 'track') {
					return { source: 'spotify', id, isPlaylist: false };
				}
			}
		}
		if (host === 'soundcloud.com') {
			const isSet = u.pathname.includes('/sets/');
			return {
				source: 'soundcloud',
				id: u.pathname.replace(/^\//, ''),
				playlistId: isSet ? u.pathname.replace(/^\//, '') : null,
				isPlaylist: isSet
			};
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
	return value;
}

function emptyState(): RoomState {
	return {
		seq: 0,
		by: '',
		videoId: null,
		source: undefined,
		current: null,
		playing: false,
		position: 0,
		clock: Date.now(),
		queue: [],
		chat: [],
		mode: 'normal',
		modeExpiresAt: undefined,
		cycleAuto: false,
		doorLocked: false,
		isPrivate: false,
		adminOnlyPlayback: true,
		admins: []
	};
}

export const DEFAULT_STARTER_TRACK: Track = {
	uid: 'starter-teddy-afro-alamin',
	videoId: 'xE-9kJOPbxE',
	source: 'youtube',
	title: 'Teddy Afro - Alamin',
	channel: 'Teddy Afro',
	addedBy: 'All Nighter',
	dedication: 'Starting track · Lock in till sunrise',
	votes: 1
};

/** Generate a clean, 12-char high-entropy cryptographic room key */
export function generateRoomKey(): string {
	const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
	const arr = new Uint8Array(12);
	if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
		crypto.getRandomValues(arr);
	} else {
		for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
	}
	return Array.from(arr)
		.map((b) => chars[b % chars.length])
		.join('');
}

/** Compute SHA-256 hash of a room key for secure verification over MQTT */
export async function hashKey(key: string): Promise<string> {
	if (!key) return '';
	const clean = key.trim();
	if (typeof crypto !== 'undefined' && crypto.subtle) {
		try {
			const buf = new TextEncoder().encode(clean);
			const hash = await crypto.subtle.digest('SHA-256', buf);
			return Array.from(new Uint8Array(hash))
				.map((b) => b.toString(16).padStart(2, '0'))
				.join('');
		} catch {
			/* fallback */
		}
	}
	let h = 0x811c9dc5;
	for (let i = 0; i < clean.length; i++) {
		h ^= clean.charCodeAt(i);
		h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
	}
	return (h >>> 0).toString(16);
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
	name = $state(typeof window !== 'undefined' ? (localStorage.getItem(LS_NAME) || '') : '');
	avatar = $state(typeof window !== 'undefined' ? (localStorage.getItem(LS_AVATAR) || '') : '');
	statusText = $state('');
	status = $state<ConnStatus>('connecting');
	state = $state<RoomState>(emptyState());
	awake = $state<Peer[]>([]);
	log = $state<LogEntry[]>([]);
	/** Current clock for timer derivations. */
	now = $state(Date.now());
	/** Estimated remote-minus-local clock skew, milliseconds. */
	offset = $state(0);
	lastRemoteAt = $state(0);

	/** Secret invite key for private rooms */
	accessKey = $state('');
	/** SHA-256 hash of active access key */
	activeKeyHash = $state('');

	/** Room lifecycle. */
	joinState = $state<JoinState>('lobby');
	title = $state('');
	isHost = $state(false);
	canonicalHost = $state('');
	/** Timestamp when this session was entered */
	roomStartedAt = $state(0);
	/** Whether dawn (06:00 AM) has been reached for this room's overnight session */
	isDawn = $derived(
		this.roomStartedAt
			? isRoomPastDawn(this.roomStartedAt, new Date(this.now))
			: false
	);
	/** Transient alert banner for room deleted / archived events */
	roomAlert = $state<{ type: 'deleted' | 'archived' | 'error' | 'info'; message: string; slug?: string } | null>(null);
	/** Whether this room was started during the night before dawn */
	private startedBeforeDawn = false;
	/** Whether this session was already auto-archived */
	private dawnArchived = false;

	/** All attendees who joined during this room session, including those who left earlier. */
	sessionAttendees = $state<Array<{ name: string; avatar?: string; intention?: string; firstSeen: number; leftAt?: number }>>([]);
	/** Track played video IDs to avoid immediate repeats when continuing with related music. */
	private playedVideoIds = new Set<string>();
	private isQueuingAutoplay = false;
	/** Timestamp when uninterrupted autoplay started. Caps autoplay at 30 minutes. */
	autoplayStartedAt = $state<number | null>(null);

	/** Peers who joined this session earlier tonight but are not currently awake in the room. */
	get leftPeers(): Array<{ name: string; avatar?: string; intention?: string }> {
		const currentNames = new Set(this.awake.map((p) => p.name.trim().toLowerCase()));
		return this.sessionAttendees.filter((a) => !currentNames.has(a.name.trim().toLowerCase()));
	}

	/** Returns a complete list of everyone who was here during this session. */
	getAllAttendees(): Array<{ name: string; avatar?: string; intention?: string }> {
		const map = new Map<string, { name: string; avatar?: string; intention?: string }>();
		for (const p of this.awake) {
			if (p.name?.trim()) {
				map.set(p.name.trim().toLowerCase(), { name: p.name.trim(), avatar: p.avatar, intention: p.intention });
			}
		}
		for (const a of this.sessionAttendees) {
			if (a.name?.trim() && !map.has(a.name.trim().toLowerCase())) {
				map.set(a.name.trim().toLowerCase(), { name: a.name.trim(), avatar: a.avatar, intention: a.intention });
			}
		}
		return Array.from(map.values());
	}

	recordAttendee(name: string, avatar?: string, intention?: string): void {
		if (!name || !name.trim()) return;
		const trimmed = name.trim();
		const lower = trimmed.toLowerCase();
		const idx = this.sessionAttendees.findIndex((a) => a.name.trim().toLowerCase() === lower);
		if (idx >= 0) {
			const item = this.sessionAttendees[idx];
			if ((!item.avatar && avatar) || (!item.intention && intention) || item.leftAt) {
				this.sessionAttendees[idx] = {
					name: item.name,
					avatar: item.avatar || avatar,
					intention: item.intention || intention,
					firstSeen: item.firstSeen,
					leftAt: undefined
				};
			}
		} else {
			this.sessionAttendees = [
				...this.sessionAttendees,
				{
					name: trimmed,
					avatar,
					intention,
					firstSeen: Date.now()
				}
			];
		}
		if (this.room) {
			try {
				localStorage.setItem('an.attendees.' + this.room, JSON.stringify(this.sessionAttendees));
			} catch {}
		}
	}

	markAttendeeLeft(name: string): void {
		if (!name || !name.trim()) return;
		const lower = name.trim().toLowerCase();
		const idx = this.sessionAttendees.findIndex((a) => a.name.trim().toLowerCase() === lower);
		if (idx >= 0) {
			this.sessionAttendees[idx] = {
				...this.sessionAttendees[idx],
				leftAt: Date.now()
			};
			if (this.room) {
				try {
					localStorage.setItem('an.attendees.' + this.room, JSON.stringify(this.sessionAttendees));
				} catch {}
			}
		}
	}

	sessionTracks = $state<Track[]>([]);

	recordTrack(track: Track | null | undefined): void {
		if (!track || !track.title) return;
		const key = (track.videoId || track.title).trim();
		if (!key) return;
		const exists = this.sessionTracks.some(
			(t) => (t.videoId && track.videoId && t.videoId === track.videoId) || t.title.trim().toLowerCase() === track.title.trim().toLowerCase()
		);
		if (!exists) {
			this.sessionTracks = [...this.sessionTracks, track];
			if (this.room) {
				try {
					localStorage.setItem('an.tracks.' + this.room, JSON.stringify(this.sessionTracks));
				} catch {}
			}
		}
	}

	getAllSessionTracks(): Track[] {
		const map = new Map<string, Track>();
		for (const t of this.sessionTracks) {
			const key = (t.videoId || t.title || '').trim();
			if (key) map.set(key, t);
		}
		if (this.state.current) {
			const key = (this.state.current.videoId || this.state.current.title || '').trim();
			if (key) map.set(key, this.state.current);
		}
		for (const t of this.state.queue) {
			const key = (t.videoId || t.title || '').trim();
			if (key) map.set(key, t);
		}
		return Array.from(map.values());
	}
	/** Current room mode: 'normal' (chat open, shared floor) or 'focus' (quiet sprint). */
	mode = $state<'normal' | 'focus' | 'break'>('normal');
	/** Seconds remaining in current mode cycle. */
	modeRemaining = $derived(
		this.state.modeExpiresAt ? Math.max(0, Math.floor((this.state.modeExpiresAt - this.now) / 1000)) : 0
	);
	/** Whether this user is an admin or the room host. */
	isAdminUser = $derived(
		this.isHost ||
		Boolean(this.clientId && this.state.admins?.includes(this.clientId)) ||
		Boolean(this.name && this.state.admins?.includes(this.name))
	);
	/** Whether host or admin can skip directly. */
	canSkip = $derived(this.isAdminUser);
	/** Whether this user is allowed to Play / Pause / Seek (Admins only). */
	canControlPlayback = $derived(this.isAdminUser);
	/** Whether this user is allowed to shuffle the playlist (Admins only). */
	canShuffle = $derived(this.isAdminUser);
	/** Whether the player was paused due to the 30-minute uninterrupted autoplay limit. */
	isAutoplayPaused = $derived(Boolean(this.state.autoplayPaused && !this.state.playing));
	/** This user's one-line intention for the night. */
	intention = $state('');
	/** Rooms advertised on the broker right now. */
	directory = $state<RoomAd[]>([]);
	/** People asking to be let in (only populated for members). */
	pending = $state<JoinRequest[]>([]);

	private client: MqttLike | null = null;
	private peers = new Map<string, Peer>();
	private inited = false;
	private everConnected = false;
	private lastRemoteState: any = null;
	private attempts = 0;
	private offlineSince = 0;
	private requestTimer = 0;
	private dirTimer = 0;
	private focusSeconds = 0;
	private dbSync: SupabaseRoomSync = new SupabaseRoomSync(
		(msg) => this.onChat(msg),
		(queue) => {
			if (queue && Array.isArray(queue)) {
				const cleanQueue = queue.filter((t) => !isBannedMusic(t.videoId, t.title));
				this.state = { ...this.state, queue: cleanQueue };
			}
		},
		(remoteState) => {
			if (remoteState) {
				let s = { ...this.state, ...remoteState };
				if (s.current && isBannedMusic(s.current.videoId, s.current.title)) {
					s.current = s.queue && s.queue.length > 0 ? s.queue[0] : null;
					s.videoId = s.current?.videoId ?? null;
					s.source = s.current?.source ?? undefined;
					if (s.queue && s.queue.length > 0) s.queue = s.queue.slice(1);
				}
				if (s.queue && s.queue.length > 0) {
					s.queue = s.queue.filter((t) => !isBannedMusic(t.videoId, t.title));
				}
				this.state = s;
			}
		},
		(isHost, canonicalHostName) => {
			this.isHost = isHost;
			if (canonicalHostName) {
				this.canonicalHost = canonicalHostName;
			}
			if (!isHost) {
				try {
					localStorage.removeItem('an.host.' + this.room);
				} catch {}
			}
		},
		(slug) => {
			this.onRemoteRoomArchived(undefined, slug);
		},
		(newTitle) => {
			if (newTitle) {
				this.title = newTitle;
				this.updateAd();
			}
		}
	);

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
		this.name = loadOrMake(LS_NAME, () => auth.displayName || `guest-${Math.floor(Math.random() * 900 + 100)}`);
		this.avatar = loadOrMake(LS_AVATAR, () => auth.avatarUrl || '/default-avatar.svg');

		// Sync name/avatar if user authenticated with Google or has cloud profile (or cached profile)
		if (auth.displayName && (this.name.startsWith('guest-') || !this.name)) {
			this.name = auth.displayName;
			try {
				localStorage.setItem(LS_NAME, auth.displayName);
			} catch {}
		}
		if (auth.avatarUrl && (this.avatar === '/default-avatar.svg' || !this.avatar)) {
			this.avatar = auth.avatarUrl;
			try {
				localStorage.setItem(LS_AVATAR, auth.avatarUrl);
			} catch {}
		}

		window.addEventListener('an:update-callsign', (e: Event) => {
			const ce = e as CustomEvent<{ name: string }>;
			if (ce.detail?.name) {
				this.setName(ce.detail.name);
			}
		});

		window.addEventListener('an:update-avatar', (e: Event) => {
			const ce = e as CustomEvent<{ avatar: string }>;
			if (ce.detail?.avatar) {
				this.setAvatar(ce.detail.avatar);
			}
		});

		window.addEventListener('an:auth-changed', () => {
			this.checkAndJoinActiveRoom();
		});

		this.peers.set(this.clientId, {
			id: this.clientId,
			name: this.name,
			avatar: this.avatar,
			ts: Date.now(),
			self: true
		});
		this.flushPeers();

		void this.connect();
		window.setInterval(() => this.announce(), PRESENCE_TICK);
		window.setInterval(() => this.tick(), 1000);
		window.addEventListener('beforeunload', this.bye);

		this.checkAndJoinActiveRoom();
	}

	checkAndJoinActiveRoom(): void {
		if (typeof location === 'undefined') return;
		if (!auth.isAuthenticated || this.joinState === 'approved') return;

		let param = new URLSearchParams(location.search).get('room');
		let title = '';
		if (!param && typeof localStorage !== 'undefined') {
			try {
				const saved = localStorage.getItem(LS_ACTIVE_ROOM);
				if (saved) {
					param = saved;
					title = localStorage.getItem(LS_ACTIVE_TITLE) ?? saved;
				}
			} catch {
				/* ignore */
			}
		}

		if (param) {
			const slug = sanitizeRoom(param) || DEFAULT_ROOM;
			let wasHost = false;
			try {
				wasHost = localStorage.getItem('an.host.' + slug) === '1';
			} catch {
				/* ignore */
			}
			const urlKey = typeof window !== 'undefined' ? new URL(window.location.href).searchParams.get('key')?.trim() : '';
			const savedKey = this.getSavedKey(slug);
			const candidateKey = urlKey || savedKey;
			if (candidateKey) {
				this.accessKey = candidateKey;
			}
			if (wasHost) {
				this.enterApproved(slug, title || slug, wasHost);
			} else {
				this.joinRoom(slug, title || slug);
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
		let mqttModule: any;
		try {
			mqttModule = await import('mqtt');
		} catch {
			this.status = 'solo';
			return;
		}

		const connectFn = mqttModule.connect || mqttModule.default?.connect;
		if (typeof connectFn !== 'function') {
			this.status = 'solo';
			return;
		}

		const tryBroker = (index: number): void => {
			if (this.everConnected && this.client?.connected) return;
			const url = BROKERS[index % BROKERS.length];
			let settled = false;

			const client = connectFn(url, {
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
				void this.accept(JSON.parse(text));
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
		if (rest === 'ctl') {
			if (!text) return;
			try {
				const cmd = JSON.parse(text);
				if (cmd.type === 'room_deleted') {
					this.onRemoteRoomDeleted(cmd.by);
				} else if (cmd.type === 'room_archived') {
					this.onRemoteRoomArchived(cmd.night);
				} else if (cmd.type === 'transfer_host') {
					this.onRemoteHostTransferred(cmd.to, cmd.toId, cmd.by);
				}
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
			const existing = this.peers.get(id);
			if (existing) {
				this.markAttendeeLeft(existing.name);
			}
			this.peers.delete(id);
			this.flushPeers();
			return;
		}
		try {
			const data = JSON.parse(text) as {
				name?: string;
				avatar?: string;
				ts?: number;
				status?: string;
				intention?: string;
				tz?: string;
			};
			if (!data?.name) return;
			const peerName = String(data.name).slice(0, 24);
			this.recordAttendee(
				peerName,
				data.avatar ? String(data.avatar) : undefined,
				data.intention ? String(data.intention).slice(0, 80) : undefined
			);
			this.peers.set(id, {
				id,
				name: peerName,
				avatar: data.avatar ? String(data.avatar) : undefined,
				status: data.status ? String(data.status).slice(0, 24) : undefined,
				intention: data.intention ? String(data.intention).slice(0, 80) : undefined,
				tz: data.tz ? String(data.tz).slice(0, 40) : undefined,
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
			if (!ad?.room) {
				this.directory = this.directory.filter((entry) => entry.room !== room);
				return;
			}
			const ts = Number(ad.ts) || 0;
			// Ignore stale retained ads older than DIR_TTL so they never ghost-flash on screen
			if (ts > 0 && Date.now() - ts > DIR_TTL) {
				this.directory = this.directory.filter((entry) => entry.room !== room);
				return;
			}
			const entry: RoomAd = {
				room: sanitizeRoom(ad.room),
				title: String(ad.title ?? ad.room).slice(0, 40),
				host: String(ad.host ?? '').slice(0, 24),
				members: Math.max(0, Number(ad.members) || 0),
				ts: ts || Date.now(),
				isPrivate: !!ad.isPrivate,
				adminOnlyPlayback: !!ad.adminOnlyPlayback
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

	private async accept(msg: Partial<RoomState> & { clock?: number }): Promise<void> {
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

		// Play chimes and sync mode if changed
		if (msg.mode && msg.mode !== this.mode) {
			const incomingMode = msg.mode === 'break' ? 'normal' : msg.mode;
			this.mode = incomingMode;
			if (incomingMode === 'focus') playFocusChime();
			else playBreakChime();
		}

		// Gate visitor if room is private or door is locked, and user is not host / permitted with valid key
		let isPermitted = this.isHost;
		if (!isPermitted && msg.accessKeyHash) {
			const candidateKey =
				this.accessKey ||
				(typeof window !== 'undefined' ? new URL(window.location.href).searchParams.get('key')?.trim() : '') ||
				this.getSavedKey(this.room);

			if (candidateKey) {
				const candidateHash = await hashKey(candidateKey);
				if (candidateHash === msg.accessKeyHash) {
					isPermitted = true;
					this.accessKey = candidateKey;
					this.activeKeyHash = candidateHash;
					try {
						localStorage.setItem('an.key.' + this.room, candidateKey);
					} catch {}
				}
			}
		}

		if ((msg.isPrivate || msg.doorLocked) && !isPermitted && this.joinState !== 'approved') {
			this.joinState = 'waiting';
			this.publishRequest();
			this.startRequesting();
		} else if ((msg.isPrivate || msg.doorLocked) && isPermitted && this.joinState !== 'approved') {
			this.admit();
		}

		// Store last raw incoming state so admit() can hydrate immediately upon host approval
		this.lastRemoteState = msg;

		const isApproved = this.joinState === 'approved';

		this.state = {
			seq: incomingSeq,
			by: incomingBy,
			videoId: isApproved ? (msg.videoId ?? null) : null,
			source: isApproved ? msg.source : undefined,
			current: isApproved ? (msg.current ?? null) : null,
			playing: isApproved ? !!msg.playing : false,
			position: Number(msg.position) || 0,
			clock: Number(msg.clock) || now,
			queue: isApproved && Array.isArray(msg.queue) ? msg.queue : [],
			chat: isApproved ? (this.state.chat ?? []) : [],
			mode: msg.mode ?? this.mode,
			modeExpiresAt: msg.modeExpiresAt,
			cycleAuto: !!msg.cycleAuto,
			doorLocked: !!msg.doorLocked,
			isPrivate: !!msg.isPrivate,
			accessKeyHash: msg.accessKeyHash,
			adminOnlyPlayback: !!msg.adminOnlyPlayback,
			autoplayPaused: isApproved ? !!msg.autoplayPaused : false,
			autoArchive: !!msg.autoArchive,
			admins: Array.isArray(msg.admins) ? msg.admins : []
		};
	}

	private onLog(entry: LogEntry): void {
		if (!entry?.id || this.log.some((item) => item.id === entry.id)) return;
		this.log = [{ ...entry, ts: entry.ts || Date.now() }, ...this.log].slice(0, 7);
	}

	private onChat(msg: ChatMessage): void {
		if (!msg?.id || this.joinState !== 'approved') return;
		const chat = this.state.chat || [];
		if (chat.some((item) => item.id === msg.id)) return;

		// Ensure avatar is populated if missing from network payload
		if (!msg.avatar) {
			if (msg.whoId === this.clientId || msg.who === this.name) {
				msg.avatar = this.avatar;
			} else if (msg.whoId && this.peers.has(msg.whoId)) {
				msg.avatar = this.peers.get(msg.whoId)?.avatar;
			} else {
				const match = this.getAllAttendees().find(
					(a) => a.name.trim().toLowerCase() === msg.who.trim().toLowerCase()
				);
				if (match?.avatar) msg.avatar = match.avatar;
			}
		} else if (msg.who) {
			this.recordAttendee(msg.who, msg.avatar);
		}

		this.state = { ...this.state, chat: [...chat, msg].slice(-100) };
	}

	sendChat(text: string): void {
		const trimmed = text.trim().slice(0, 280);
		if (!trimmed || this.joinState !== 'approved') return;
		const msg: ChatMessage = {
			id: randomId(),
			who: this.name,
			whoId: this.clientId,
			avatar: this.avatar,
			text: trimmed,
			ts: Date.now()
		};
		this.pub(this.t('chat'), JSON.stringify(msg));
		this.onChat(msg);
		void this.dbSync.saveMessage(msg);
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
		this.pub(
			this.t('state'),
			JSON.stringify({
				...shared,
				mode: this.mode,
				modeExpiresAt: this.state.modeExpiresAt,
				cycleAuto: this.state.cycleAuto,
				doorLocked: this.state.doorLocked,
				isPrivate: this.state.isPrivate,
				accessKeyHash: this.state.accessKeyHash,
				adminOnlyPlayback: this.state.adminOnlyPlayback,
				admins: this.state.admins ?? [],
				clock: Date.now()
			}),
			true
		);
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
		const now = Date.now();
		const prevQueue = this.state.queue;
		const base = next(this.state);

		// Purge banned tracks from current playback and queue
		if (base.current && isBannedMusic(base.current.videoId, base.current.title)) {
			base.current = base.queue && base.queue.length > 0 ? base.queue[0] : null;
			base.videoId = base.current?.videoId ?? null;
			base.source = base.current?.source ?? undefined;
			if (base.queue && base.queue.length > 0) base.queue = base.queue.slice(1);
		}
		if (base.queue && base.queue.length > 0) {
			base.queue = base.queue.filter((t) => !isBannedMusic(t.videoId, t.title));
		}

		if (base.current) this.recordTrack(base.current);
		if (base.queue) {
			for (const t of base.queue) this.recordTrack(t);
		}

		const seq = options?.keepSeq ? this.state.seq || now : now;

		// If mutation did not explicitly change playback position, advance position by elapsed playback time
		let position = base.position;
		let clock = now;
		const isPlaybackChange =
			base.position !== this.state.position ||
			base.playing !== this.state.playing ||
			base.videoId !== this.state.videoId;

		if (!isPlaybackChange && this.state.playing && this.state.clock) {
			// If playback parameters did not change (e.g. mode switch, admin toggle), preserve the clock anchor
			// so that playback remains completely continuous without any micro-seeking.
			position = this.state.position;
			clock = this.state.clock;
		}

		this.state = { ...base, position, seq, by: this.clientId, clock };
		this.publishState();
		if (logText) this.writeLog(logText);

		// Synchronize queue to Supabase database if queue changed
		if (prevQueue !== this.state.queue) {
			void this.dbSync.syncQueue(this.state.queue);
		}

		// Save playback state to Supabase if director / host
		if (this.isHost || this.state.by === this.clientId) {
			void this.dbSync.savePlayback({
				playing: this.state.playing,
				position: this.state.position,
				current: this.state.current,
				videoId: this.state.videoId,
				mode: this.mode,
				doorLocked: this.state.doorLocked,
				history: this.getAllSessionTracks()
			});
		}
	}

	/* --------------------------------------------------------- room lifecycle */

	private subscribeActive(): void {
		if (!this.client?.connected || !this.room) return;
		this.client.subscribe([
			this.t('state'),
			this.t('p/#'),
			this.t('log'),
			this.t('chat'),
			this.t('ctl'),
			this.t('join/#'),
			this.decTopic(this.room, this.clientId)
		]);
	}

	/** Create a room and step inside as its host. */
	async createRoom(
		name: string,
		isPrivate = false,
		adminOnlyPlayback = true,
		customKey?: string,
		autoArchive = true
	): Promise<void> {
		if (!areDoorsOpen()) {
			this.roomAlert = {
				type: 'error',
				message: 'Doors unlock at sunset (18:00). Rooms cannot be created during daytime.'
			};
			return;
		}

		if (!auth.isCloudUser && !auth.user) {
			console.warn('[room] Must be signed in with an account to create a room');
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('an:open-auth-modal', { detail: { mode: 'signin' } }));
			}
			return;
		}
		const slug = sanitizeRoom(name);
		if (!slug) {
			console.warn('[room] Cannot create room without a valid room name');
			return;
		}

		// Enforce maximum 1 active room per user
		if (this.dbSync.isEnabled && supabase) {
			try {
				const userId = auth.user?.id;
				const userName = (auth.displayName || this.name || '').trim();
				let q = supabase.from('rooms').select('slug').eq('status', 'active');
				if (userId && userName && userName !== 'night-owl' && !userName.startsWith('guest-')) {
					q = q.or(`host_id.eq.${userId},host_name.eq."${userName}"`);
				} else if (userId) {
					q = q.eq('host_id', userId);
				}
				const { data: existingRooms } = await q;
				if (existingRooms && existingRooms.length >= 1 && !existingRooms.some((r) => r.slug === slug)) {
					this.roomAlert = {
						type: 'error',
						message: 'Room limit reached: You can only host 1 active room at a time. Please close your existing room first.'
					};
					return;
				}
			} catch (err) {
				console.warn('[room] Failed to check room limit:', err);
			}
		}

		try {
			recordStat('roomsHosted', 1);
		} catch {}

		let key = '';
		let keyHash = '';
		if (isPrivate) {
			key = customKey?.trim() || generateRoomKey();
			keyHash = await hashKey(key);
			try {
				localStorage.setItem('an.key.' + slug, key);
			} catch {}
		}

		const effectiveAutoArchive = isPrivate ? autoArchive : true;
		try {
			localStorage.setItem('an.auto_archive.' + slug, effectiveAutoArchive ? '1' : '0');
		} catch {}

		this.enterApproved(slug, name.trim() || slug, true, true, isPrivate, adminOnlyPlayback, key, keyHash, effectiveAutoArchive);
	}

	/** Toggle archive preference for this room (Host only, private rooms only). */
	toggleAutoArchive(): void {
		if (!this.isHost || !this.state.isPrivate) return;
		const next = this.state.autoArchive === false ? true : false;
		this.state = {
			...this.state,
			autoArchive: next
		};
		if (this.room) {
			try {
				localStorage.setItem('an.auto_archive.' + this.room, next ? '1' : '0');
			} catch {}
		}
		this.publishState();
	}

	/** Step into a room (open by default). */
	joinRoom(slug: string, title?: string): void {
		const clean = sanitizeRoom(slug);
		let wasHost = false;
		try {
			wasHost = localStorage.getItem('an.host.' + clean) === '1';
		} catch {
			/* ignore */
		}
		if (wasHost) {
			this.enterApproved(clean, title?.trim() || clean, wasHost);
			return;
		}

		// Check if known in directory to be private
		const knownAd = this.directory.find((d) => d.room === clean);
		if (knownAd?.isPrivate) {
			const candidateKey =
				this.accessKey ||
				(typeof window !== 'undefined' ? new URL(window.location.href).searchParams.get('key')?.trim() : '') ||
				this.getSavedKey(clean);

			if (!candidateKey) {
				this.requestJoin(clean, title || knownAd.title);
				return;
			}
		}

		this.enterApproved(clean, title?.trim() || clean, false);
	}

	/** Ask the members of `slug` to let us in (if door is locked). */
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
		try {
			localStorage.setItem(LS_ACTIVE_ROOM, this.room);
			localStorage.setItem(LS_ACTIVE_TITLE, this.title || this.room);
		} catch {
			/* ignore */
		}
		this.syncUrl(this.room);
		this.subscribeActive();

		this.sessionAttendees = [];
		try {
			const savedAttendees = localStorage.getItem('an.attendees.' + this.room);
			if (savedAttendees) {
				const parsed = JSON.parse(savedAttendees);
				if (Array.isArray(parsed)) {
					this.sessionAttendees = parsed;
				}
			}
		} catch {}
		this.recordAttendee(this.name, this.avatar, this.intention);

		this.announce();

		// Hydrate full room state from cached remote state if available
		if (this.lastRemoteState) {
			const msg = this.lastRemoteState;
			this.state = {
				...this.state,
				videoId: msg.videoId ?? null,
				source: msg.source,
				current: msg.current ?? null,
				playing: !!msg.playing,
				position: Number(msg.position) || 0,
				queue: Array.isArray(msg.queue) ? msg.queue : [],
				chat: this.state.chat ?? [],
				mode: msg.mode ?? this.mode,
				doorLocked: !!msg.doorLocked,
				isPrivate: !!msg.isPrivate,
				adminOnlyPlayback: !!msg.adminOnlyPlayback,
				admins: Array.isArray(msg.admins) ? msg.admins : []
			};
		}

		this.publishState();
		this.startDirectory();
		void this.dbSync.attachRoom(this.room, this.title, auth.user?.id || this.clientId, this.name);
	}

	private enterApproved(
		slug: string,
		title: string,
		host: boolean,
		isNew = false,
		isPrivate = false,
		adminOnlyPlayback = true,
		accessKey = '',
		accessKeyHash = '',
		autoArchive = true
	): void {
		this.resetRoom();
		this.room = slug;
		this.title = title;
		this.isHost = host;
		if (host) {
			this.canonicalHost = this.name;
		} else {
			const adHost = this.directory.find((entry) => entry.room === slug)?.host;
			if (adHost) this.canonicalHost = adHost;
		}
		this.joinState = 'approved';
		if (isNew) {
			this.roomStartedAt = Date.now();
			try {
				localStorage.setItem('an.started.' + slug, String(this.roomStartedAt));
			} catch {}
		} else {
			try {
				const saved = localStorage.getItem('an.started.' + slug);
				this.roomStartedAt = saved ? Number(saved) : (this.roomStartedAt || Date.now());
			} catch {
				this.roomStartedAt = this.roomStartedAt || Date.now();
			}
		}
		this.startedBeforeDawn = !isDawnReached(new Date());
		this.dawnArchived = false;

		if (accessKey) {
			this.accessKey = accessKey;
		}
		if (accessKeyHash) {
			this.activeKeyHash = accessKeyHash;
		}

		let initialAutoArchive = true;
		if (isPrivate) {
			initialAutoArchive = autoArchive;
			try {
				const savedArchivePref = localStorage.getItem('an.auto_archive.' + slug);
				if (savedArchivePref !== null) {
					initialAutoArchive = savedArchivePref === '1';
				}
			} catch {}
		}

		if (isNew) {
			const starter: Track = {
				...DEFAULT_STARTER_TRACK,
				uid: `starter-${Date.now()}`
			};
			this.recordTrack(starter);
			this.state = {
				...this.state,
				current: starter,
				videoId: starter.videoId,
				source: 'youtube',
				playing: false,
				position: 0,
				clock: Date.now(),
				by: this.clientId,
				isPrivate,
				doorLocked: isPrivate,
				accessKeyHash: accessKeyHash || undefined,
				adminOnlyPlayback,
				autoArchive: initialAutoArchive
			};
		} else {
			this.state = {
				...this.state,
				autoArchive: initialAutoArchive
			};
		}

		try {
			const savedTracks = localStorage.getItem('an.tracks.' + slug);
			if (savedTracks) {
				const parsed = JSON.parse(savedTracks);
				if (Array.isArray(parsed)) this.sessionTracks = parsed;
			}
		} catch {}

		try {
			localStorage.setItem(LS_ACTIVE_ROOM, slug);
			localStorage.setItem(LS_ACTIVE_TITLE, title || slug);
			if (host) {
				localStorage.setItem('an.host.' + slug, '1');
			}
		} catch {
			/* ignore */
		}
		this.syncUrl(slug);
		this.subscribeActive();
		this.announce();
		if (isNew) {
			this.publishState();
			void this.ensureAutoplayQueued(this.state.current);
		} else if (host) {
			// On reload as host: give MQTT/peers 2.5s to hydrate live state.
			// Only if room is truly empty and no state arrived do we seed starter track.
			setTimeout(() => {
				if (this.room === slug && this.joinState === 'approved' && !this.state.current && !this.state.videoId) {
					const starter: Track = {
						...DEFAULT_STARTER_TRACK,
						uid: `starter-${Date.now()}`
					};
					this.state = {
						...this.state,
						current: starter,
						videoId: starter.videoId,
						source: 'youtube',
						playing: false,
						position: 0,
						clock: Date.now(),
						by: this.clientId
					};
					this.publishState();
				}
			}, 2500);
		}
		this.startDirectory();
		void this.dbSync.attachRoom(slug, title, auth.user?.id || this.clientId, this.name);
		if (isNew && this.state.current) {
			void this.dbSync.savePlayback(this.state);
		}
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
		this.dbSync.unsubscribe();
		if (this.room && this.joinState === 'approved') {
			this.pub(this.presenceTopic(this.room, this.clientId), '', true);
		}
		if (this.room) {
			try {
				localStorage.removeItem(LS_ACTIVE_ROOM);
				localStorage.removeItem(LS_ACTIVE_TITLE);
			} catch {
				/* ignore */
			}
		}
		this.resetRoom();
		this.joinState = 'lobby';
		this.syncUrl('');
	}

	/**
	 * Delete this room session (Owner only).
	 * If archive preference is enabled or requested, the room will be archived into the logbook.
	 */
	async deleteRoom(shouldArchive?: boolean): Promise<void> {
		if (!this.isHost) {
			console.warn('[Room] Only the owner can delete a room.');
			return;
		}

		// Whether public or private, automatically archive if dawn (sunrise) is reached or if requested.
		const doArchive = this.isDawn || (shouldArchive !== undefined ? shouldArchive : false);
		if (doArchive) {
			await this.archiveRoom();
			return;
		}

		if (!this.room) return;
		const roomSlug = this.room;
		const roomTitle = this.title || roomSlug;

		// 1. Broadcast deletion to all peers in the room
		this.pub(
			this.t('ctl'),
			JSON.stringify({ type: 'room_deleted', by: this.name, room: roomSlug, ts: Date.now() }),
			true
		);

		// 2. Remove directory ad immediately
		this.pub(this.dirTopic(roomSlug), '', true);

		// 3. Mark closed in database if Supabase enabled
		if (this.dbSync.isEnabled && supabase) {
			try {
				await supabase
					.from('rooms')
					.update({ status: 'closed', closed_at: new Date().toISOString() })
					.eq('slug', roomSlug);
			} catch (err) {
				console.warn('[Supabase] Failed to mark room closed:', err);
			}
		}

		// 4. Clean up host flag & return to lobby
		try {
			localStorage.removeItem('an.host.' + roomSlug);
		} catch {}

		this.roomAlert = {
			type: 'deleted',
			message: `Room “${roomTitle}” was deleted.`
		};
		this.leave();
	}

	/**
	 * Archive the current room session into the logbook (Owner only).
	 */
	async archiveRoom(): Promise<void> {
		if (!this.isHost) {
			console.warn('[Room] Only the owner can archive a room.');
			return;
		}
		if (!this.room) return;
		const roomSlug = this.room;
		const roomTitle = this.title || roomSlug;

		// 1. Build night archive record (including everyone who joined and left)
		const allAttendees = this.getAllAttendees();
		const sessionTracks = this.getAllSessionTracks();
		const night = buildNightFromRoom(
			roomSlug,
			roomTitle,
			this.awake,
			this.state.current,
			this.state.queue,
			allAttendees,
			sessionTracks
		);

		// 2. Save locally into personal logbook
		saveToMyNights(night);
		try {
			recordStat('dawnRituals', 1);
		} catch {}

		// 3. Save to Supabase session_archives if enabled
		if (this.dbSync.isEnabled) {
			try {
				await this.dbSync.archiveSession({
					slug: night.slug,
					title: night.title,
					startedAt: new Date(this.roomStartedAt || Date.now() - 6 * 3600 * 1000).toISOString(),
					attendees: (night.attendees && night.attendees.length > 0)
						? night.attendees
						: allAttendees.map((a) => ({ name: a.name, avatar: a.avatar })),
					playlist: night.tracklist,
					summary: night.note
				});
			} catch (err) {
				console.warn('[Room] Supabase archive failed:', err);
			}
		}

		// 4. Play sunrise chime
		try {
			playDawnChime();
		} catch {}

		// 5. Broadcast archival to all peers so they also save it to their logbook
		this.pub(
			this.t('ctl'),
			JSON.stringify({ type: 'room_archived', by: this.name, room: roomSlug, night, ts: Date.now() }),
			true
		);

		// 6. Remove directory ad
		this.pub(this.dirTopic(roomSlug), '', true);
		this.clearRoomAd(roomSlug);

		// Direct update to rooms table to guarantee room is marked archived in DB
		if (supabase) {
			try {
				await supabase
					.from('rooms')
					.update({ status: 'archived', closed_at: new Date().toISOString() })
					.eq('slug', roomSlug);
			} catch {}
		}

		// 7. Clean up host flag & leave
		try {
			localStorage.removeItem('an.host.' + roomSlug);
		} catch {}

		this.roomAlert = {
			type: 'archived',
			message: `Dawn reached! Session “${night.title}” has been archived to your logbook.`,
			slug: night.slug
		};
		this.leave();

		// 8. Navigate to the archive page
		if (typeof window !== 'undefined') {
			goto(`/archive/${night.slug}`);
		}
	}

	private onRemoteRoomDeleted(by: string): void {
		if (!this.isHost) {
			this.roomAlert = {
				type: 'deleted',
				message: `Room session was closed and deleted by the owner (${by || 'host'}).`
			};
			this.leave();
		}
	}

	private onRemoteRoomArchived(night?: Night, roomSlug?: string): void {
		if (night) {
			try {
				saveToMyNights(night);
			} catch {}
		}
		const slug = night?.slug || roomSlug || this.room;
		this.roomAlert = {
			type: 'archived',
			message: `Dawn reached! Session “${night?.title || this.title || this.room}” has been archived to the logbook.`,
			slug
		};
		try {
			if (this.room) {
				localStorage.removeItem('an.host.' + this.room);
			}
		} catch {}
		this.isHost = false;
		if (this.room) {
			this.clearRoomAd(this.room);
		}
		this.leave();
		if (typeof window !== 'undefined') {
			if (slug) {
				goto(`/archive/${slug}`);
			} else {
				goto('/archive');
			}
		}
	}

	private onRemoteHostTransferred(toName: string, toId?: string, by?: string): void {
		this.canonicalHost = toName;
		const amINewHost = Boolean(
			(toId && this.clientId === toId) ||
			(this.name && this.name.trim().toLowerCase() === toName.trim().toLowerCase())
		);
		this.isHost = amINewHost;
		if (amINewHost) {
			this.roomAlert = {
				type: 'info',
				message: `👑 You are now the host of this room (ownership transferred by ${by || 'previous host'}).`
			};
		}
		this.writeLog(`👑 Host ownership transferred to ${toName}`);
		this.updateAd();
	}

	/** Transfer room host ownership to another peer (Host only) */
	async transferOwnership(newHostId: string, newHostName: string): Promise<void> {
		if (!this.isHost) {
			console.warn('[Room] Only the current host can transfer ownership.');
			return;
		}
		const cleanName = newHostName.trim();
		if (!cleanName) return;

		// 1. Update local host authority
		this.isHost = false;
		this.canonicalHost = cleanName;

		// 2. Broadcast via MQTT ctl to all connected peers
		this.pub(
			this.t('ctl'),
			JSON.stringify({ type: 'transfer_host', to: cleanName, toId: newHostId, by: this.name })
		);

		// 3. Persist new host in Supabase
		await this.dbSync.transferHost(newHostId, cleanName);

		// 4. Log and re-publish directory ad
		this.writeLog(`👑 Host ownership transferred to ${cleanName}`);
		this.updateAd();
		this.roomAlert = {
			type: 'info',
			message: `Host ownership was transferred to ${cleanName}.`
		};
	}

	private syncUrl(slug: string): void {
		if (typeof window === 'undefined') return;
		try {
			const url = new URL(window.location.href);
			// Only update URL query params when on the /room route
			if (url.pathname === '/room') {
				if (slug) {
					url.searchParams.set('room', slug);
					if (this.state.isPrivate && this.accessKey) {
						url.searchParams.set('key', this.accessKey);
					}
				} else {
					url.searchParams.delete('room');
					url.searchParams.delete('key');
				}
				url.searchParams.delete('invite');
				goto(url.toString(), { replace: true, reset: false });
			}
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
				ts: Date.now(),
				isPrivate: !!this.state.isPrivate,
				adminOnlyPlayback: !!this.state.adminOnlyPlayback
			} satisfies RoomAd),
			true
		);
	}

	/** Keep the original host name when other members refresh the ad. */
	hostName(): string {
		if (this.canonicalHost) return this.canonicalHost;
		const adHost = this.directory.find((entry) => entry.room === this.room)?.host;
		if (adHost) return adHost;
		return this.isHost ? this.name : '';
	}

	/** Explicitly clear an ad for a deleted or archived room from local directory and broker */
	clearRoomAd(roomSlug: string): void {
		const slug = sanitizeRoom(roomSlug);
		this.directory = this.directory.filter((entry) => entry.room !== slug);
		this.pub(this.dirTopic(slug), '', true);
	}

	/* -------------------------------------------------------------- actions */

	announce(): void {
		if (!this.clientId || this.joinState !== 'approved' || !this.room) return;
		const userTz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
		const currentAvatar = this.avatar || auth.avatarUrl || '/default-avatar.svg';
		this.peers.set(this.clientId, {
			id: this.clientId,
			name: this.name,
			avatar: currentAvatar,
			status: this.statusText || undefined,
			intention: this.intention || undefined,
			tz: userTz,
			ts: Date.now(),
			self: true
		});
		this.flushPeers();
		this.pub(
			this.presenceTopic(this.room, this.clientId),
			JSON.stringify({
				name: this.name,
				avatar: currentAvatar,
				status: this.statusText || undefined,
				intention: this.intention || undefined,
				tz: userTz,
				ts: Date.now()
			}),
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
		this.recordAttendee(this.name, this.avatar, this.intention);
		this.announce();
	}

	setAvatar(value: string): void {
		this.avatar = value;
		try {
			localStorage.setItem(LS_AVATAR, value);
		} catch {
			/* private mode */
		}
		this.recordAttendee(this.name, this.avatar, this.intention);
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
		const trimmed = value.trim();
		if (trimmed) {
			try {
				recordStat('intentionsSet', 1);
			} catch {}
		}
		this.intention = value.slice(0, 80);
		this.recordAttendee(this.name, this.avatar, this.intention);
		this.announce();
	}

	setMode(next: 'normal' | 'focus' | 'break', durationMinutes?: number): void {
		const targetMode = next === 'break' ? 'normal' : next;
		this.mode = targetMode;
		const defaultDuration = targetMode === 'focus' ? 50 : 0;
		const duration = durationMinutes !== undefined ? durationMinutes : defaultDuration;
		const expiresAt = duration > 0 ? Date.now() + duration * 60 * 1000 : undefined;
		const label = targetMode === 'focus' ? '🎯 focus mode' : '✨ normal mode';
		this.mutate(
			(s) => ({
				...s,
				mode: targetMode,
				modeExpiresAt: expiresAt
			}),
			`switched the room to ${label}`
		);
		if (targetMode === 'focus') playFocusChime();
		else playBreakChime();
	}

	toggleAutoCycle(): void {
		if (!this.isHost) return;
		const nextAuto = !this.state.cycleAuto;
		const duration = this.mode === 'focus' ? 50 : 15;
		const expiresAt = Date.now() + duration * 60 * 1000;
		this.mutate(
			(s) => ({
				...s,
				cycleAuto: nextAuto,
				modeExpiresAt: nextAuto ? expiresAt : undefined
			}),
			nextAuto ? 'enabled auto cycle' : 'disabled auto cycle'
		);
	}

	toggleDoorLock(): void {
		if (!this.isHost) return;
		const nextLock = !this.state.doorLocked;
		this.mutate(
			(s) => ({
				...s,
				doorLocked: nextLock
			}),
			nextLock ? 'locked the room door' : 'unlocked the room door'
		);
	}

	togglePrivacy(): void {
		console.warn('[Room] Room privacy is permanent and cannot be modified after creation.');
	}

	isAdmin(peerId: string, peerName?: string): boolean {
		if (this.isHost && (peerId === this.clientId || peerName === this.name)) return true;
		if (this.hostName() === peerName) return true;
		const list = this.state.admins ?? [];
		return list.includes(peerId) || (peerName ? list.includes(peerName) : false);
	}

	toggleAdmin(peerId: string, peerName?: string): void {
		if (!this.isHost) return;
		const current = this.state.admins ?? [];
		const isCurrentlyAdmin = current.includes(peerId) || (peerName ? current.includes(peerName) : false);
		const nextAdmins = isCurrentlyAdmin
			? current.filter((id) => id !== peerId && (!peerName || id !== peerName))
			: [...current, peerId];
		this.mutate(
			(s) => ({ ...s, admins: nextAdmins }),
			isCurrentlyAdmin ? `revoked admin rights from ${peerName || peerId}` : `promoted ${peerName || peerId} to room admin`
		);
	}

	setAdminOnlyPlayback(enabled: boolean): void {
		if (!this.isHost) return;
		this.mutate(
			(s) => ({ ...s, adminOnlyPlayback: enabled }),
			enabled ? 'set Aux to Admin only' : 'set Aux to No Admin (open to everyone)'
		);
		this.updateAd();
	}

	add(
		videoIdOrUrl: string | null,
		title: string,
		channel: string | undefined,
		addedBy: string,
		source?: TrackSource,
		url?: string,
		dedication?: string,
		tag?: 'focus' | 'hangout',
		isPlaylist?: boolean,
		playlistId?: string
	): void {
		this.autoplayStartedAt = null;
		const raw = videoIdOrUrl ?? '';
		const parsed = source ? null : parseTrackUrl(raw);
		const trackSource = source ?? parsed?.source ?? (raw.includes('youtube.com') || raw.includes('youtu.be') ? 'youtube' : 'unknown');
		const videoId = trackSource === 'youtube' ? (parsed?.id ?? raw ?? null) : null;

		// Block banned music from being queued
		if (isBannedMusic(videoId, title)) {
			return;
		}

		const trackUrl = url ?? raw;
		const playlist = isPlaylist ?? parsed?.isPlaylist;
		const plistId = playlistId ?? parsed?.playlistId ?? undefined;
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
			tag,
			isPlaylist: playlist,
			playlistId: plistId
		};
		try {
			recordStat('tracksQueued', 1);
		} catch {}
		this.mutate((s) => {
			if (!s.current) {
				return {
					...s,
					current: track,
					videoId: track.videoId,
					playlistId: plistId ?? null,
					source: track.source,
					playing: true,
					position: 0
				};
			}
			const humanQueue = s.queue.filter((t) => t.addedBy !== 'Autoplay');
			const queue = [...humanQueue, track];
			return { ...s, queue };
		}, `added “${title}”` + (playlist ? ' (playlist)' : '') + (track.dedication ? ` (dedicated: “${track.dedication}”)` : ''));
		if (!this.state.current || this.state.current.uid === track.uid) {
			void this.ensureAutoplayQueued(track);
		}
	}

	addMany(
		tracks: Array<{
			videoId: string | null;
			title: string;
			channel?: string;
			source?: TrackSource;
			url?: string;
			dedication?: string;
			tag?: 'focus' | 'hangout';
			isPlaylist?: boolean;
			playlistId?: string;
		}>,
		addedBy: string,
		tag?: 'focus' | 'hangout',
		playlistTitle?: string
	): void {
		this.autoplayStartedAt = null;
		const filtered = tracks.filter((t) => !isBannedMusic(t.videoId, t.title));
		if (!filtered.length) return;
		const newTracks: Track[] = filtered.map((t) => ({
			uid: randomId(),
			videoId: t.videoId,
			source: t.source ?? 'youtube',
			url: t.url ?? (t.videoId ? `https://www.youtube.com/watch?v=${t.videoId}` : ''),
			title: t.title,
			channel: t.channel || 'YouTube',
			addedBy,
			addedById: this.clientId,
			votes: 0,
			voters: [],
			reactions: {},
			dedication: t.dedication?.trim() ? t.dedication.trim().slice(0, 80) : undefined,
			tag: t.tag ?? tag,
			isPlaylist: t.isPlaylist,
			playlistId: t.playlistId
		}));

		try {
			recordStat('tracksQueued', tracks.length);
		} catch {}

		this.mutate((s) => {
			if (!s.current) {
				const [first, ...rest] = newTracks;
				return {
					...s,
					current: first,
					videoId: first.videoId,
					playlistId: first.playlistId ?? null,
					source: first.source,
					playing: true,
					position: 0,
					queue: [...rest]
				};
			}
			const humanQueue = s.queue.filter((t) => t.addedBy !== 'Autoplay');
			return {
				...s,
				queue: [...humanQueue, ...newTracks]
			};
		}, `queued playlist “${playlistTitle || 'Playlist'}” (${newTracks.length} tracks)`);
		if (this.state.queue.length === 0 && this.state.current) {
			void this.ensureAutoplayQueued(this.state.current);
		}
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
		if (!this.isAdminUser) return;
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

	shuffleQueue(): void {
		if (!this.isAdminUser || this.state.queue.length <= 1) return;
		this.mutate((s) => {
			const q = [...s.queue];
			for (let i = q.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[q[i], q[j]] = [q[j], q[i]];
			}
			return { ...s, queue: q };
		}, 'shuffled the playlist');
	}

	playNow(track: Track): void {
		if (!this.canControlPlayback) return;
		this.autoplayStartedAt = null;
		this.mutate(
			(s) => {
				const humanQueue = s.queue.filter((item) => item.uid !== track.uid && item.addedBy !== 'Autoplay');
				humanQueue.sort((a, b) => (b.votes || 0) - (a.votes || 0));
				return {
					...s,
					current: track,
					videoId: track.videoId,
					source: track.source,
					playing: true,
					position: 0,
					queue: humanQueue
				};
			},
			`put “${track.title}” on`
		);
		void this.ensureAutoplayQueued(track);
	}

	toggle(position: number): void {
		const isStartingFromAutoplayPause = !this.state.playing && this.isAutoplayPaused;
		if (!this.canControlPlayback && !isStartingFromAutoplayPause) return;
		if (!this.state.playing && !this.isHost && !isStartingFromAutoplayPause) {
			this.roomAlert = {
				type: 'info',
				message: 'The host must start the player.'
			};
			return;
		}
		const nextPlaying = !this.state.playing;
		if (nextPlaying) {
			this.autoplayStartedAt = Date.now();
		}
		this.mutate(
			(s) => ({ ...s, playing: nextPlaying, autoplayPaused: false, position }),
			isStartingFromAutoplayPause ? 'Autoplay resumed by listener' : undefined
		);
		if (nextPlaying && this.state.current) {
			void this.ensureAutoplayQueued(this.state.current);
		}
	}

	seekTo(position: number): void {
		if (!this.canControlPlayback) return;
		this.mutate((s) => ({ ...s, position }));
	}

	/**
	 * Automatically ensures the next related track is always queued in the room queue.
	 * Only the director executes this to ensure rock-solid determinism across all peers.
	 */
	async ensureAutoplayQueued(forTrack?: Track | null): Promise<void> {
		if (!this.canControlPlayback && !this.isDirector() && !this.isHost) return;
		if (this.isQueuingAutoplay) return;

		const current = forTrack || this.state.current;
		if (!current?.videoId) return;

		// 30-minute uninterrupted autoplay limit
		if (this.autoplayStartedAt !== null && Date.now() - this.autoplayStartedAt >= 30 * 60 * 1000) {
			return; // 30 minutes reached: let current queue finish and pause naturally
		}

		// If human tracks are in the queue, do not add an autoplay track
		const hasHumanTracks = this.state.queue.some((t) => t.addedBy !== 'Autoplay');
		if (hasHumanTracks) return;

		const currentLang = detectMusicLanguage(current);

		// If queue already has an autoplay track of the same language, no need to replace
		if (this.state.queue.length > 0) {
			const existing = this.state.queue[0];
			if (existing.addedBy === 'Autoplay' && detectMusicLanguage(existing) === currentLang) {
				return;
			}
		}

		this.isQueuingAutoplay = true;
		try {
			this.playedVideoIds.add(current.videoId);

			const related = getRelatedTrackSync(current, this.playedVideoIds);
			if (!related?.videoId || related.videoId === current.videoId) return;

			this.playedVideoIds.add(related.videoId);

			const autoTrack: Track = {
				uid: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				videoId: related.videoId,
				title: related.title,
				channel: related.channel,
				addedBy: 'Autoplay',
				source: 'youtube',
				url: `https://www.youtube.com/watch?v=${related.videoId}`,
				reactions: {}
			};

			this.mutate(
				(s) => {
					const humanQueue = s.queue.filter((t) => t.addedBy !== 'Autoplay');
					if (humanQueue.length > 0) return s;
					return {
						...s,
						queue: [autoTrack]
					};
				}
			);
		} catch (err) {
			console.warn('[Room] Failed to queue next autoplay track:', err);
		} finally {
			this.isQueuingAutoplay = false;
		}
	}

	async continueWithRelated(lastTrack?: Track | null): Promise<void> {
		try {
			// Enforce 30-minute maximum autoplay limit
			if (this.autoplayStartedAt !== null && Date.now() - this.autoplayStartedAt >= 30 * 60 * 1000) {
				this.mutate(
					(s) => ({ ...s, playing: false, autoplayPaused: true }),
					'Autoplay paused after 30 minutes · Anyone can resume'
				);
				return;
			}

			if (this.autoplayStartedAt === null) {
				this.autoplayStartedAt = Date.now();
			}

			const finishedTrack = lastTrack || this.state.current;
			if (finishedTrack?.videoId) {
				this.playedVideoIds.add(finishedTrack.videoId);
			}

			const related = getRelatedTrackSync(finishedTrack, this.playedVideoIds);
			if (!related?.videoId || related.videoId === finishedTrack?.videoId) return;

			this.playedVideoIds.add(related.videoId);

			const nextTrack: Track = {
				uid: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				videoId: related.videoId,
				title: related.title,
				channel: related.channel,
				addedBy: 'Autoplay',
				source: 'youtube',
				url: `https://www.youtube.com/watch?v=${related.videoId}`,
				reactions: {}
			};

			this.mutate(
				(s) => ({
					...s,
					current: nextTrack,
					videoId: nextTrack.videoId,
					playlistId: null,
					source: 'youtube',
					playing: true,
					position: 0
				}),
				`Autoplaying related: “${nextTrack.title}”`
			);

			void this.ensureAutoplayQueued(nextTrack);
		} catch (err) {
			console.warn('[Room] Failed to continue with related track:', err);
		}
	}

	skip(): void {
		if (!this.canSkip) return;
		const finished = this.state.current?.title;
		const lastTrack = this.state.current;

		if (lastTrack?.videoId) {
			this.playedVideoIds.add(lastTrack.videoId);
		}

		if (this.state.queue.length > 0) {
			const [next, ...rest] = this.state.queue;
			if (next?.addedBy !== 'Autoplay') {
				this.autoplayStartedAt = null;
			}
			this.mutate(
				(s) => ({
					...s,
					queue: rest,
					current: next ?? null,
					videoId: next?.videoId ?? null,
					playlistId: next?.playlistId ?? null,
					source: next?.source,
					playing: !!next,
					position: 0
				}),
				finished ? `skipped “${finished}”` : 'skipped ahead'
			);
			if (next) {
				void this.ensureAutoplayQueued(next);
			}
		} else {
			// When queue is empty, immediately continue with next related track
			const related = getRelatedTrackSync(lastTrack, this.playedVideoIds);
			this.playedVideoIds.add(related.videoId);

			const nextTrack: Track = {
				uid: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				videoId: related.videoId,
				title: related.title,
				channel: related.channel,
				addedBy: 'Autoplay',
				source: 'youtube',
				url: `https://www.youtube.com/watch?v=${related.videoId}`,
				reactions: {}
			};

			this.mutate(
				(s) => ({
					...s,
					queue: [],
					current: nextTrack,
					videoId: nextTrack.videoId,
					playlistId: null,
					source: 'youtube',
					playing: true,
					position: 0
				}),
				finished ? `skipped “${finished}”` : 'skipped ahead'
			);
			void this.ensureAutoplayQueued(nextTrack);
		}
	}

	/** The video ended on its own: advance immediately, or continue with related music seamlessly. */
	ended(watchId: string | null): void {
		if (watchId && this.state.videoId !== watchId) return;
		if (!this.state.playing) return;
		const finished = this.state.current?.title;
		const lastTrack = this.state.current;

		if (lastTrack?.videoId) {
			this.playedVideoIds.add(lastTrack.videoId);
		}

		if (this.state.queue.length > 0) {
			const [next, ...rest] = this.state.queue;
			if (next?.addedBy !== 'Autoplay') {
				this.autoplayStartedAt = null;
			}
			this.mutate((s) => ({
				...s,
				queue: rest,
				current: next ?? null,
				videoId: next?.videoId ?? null,
				playlistId: next?.playlistId ?? null,
				source: next?.source,
				playing: !!next,
				position: 0
			}));
			if (finished) this.writeLog(`finished “${finished}”`);
			if (next) {
				void this.ensureAutoplayQueued(next);
			}
		} else {
			// Queue is empty: check 30-minute uninterrupted autoplay limit
			if (this.autoplayStartedAt !== null && Date.now() - this.autoplayStartedAt >= 30 * 60 * 1000) {
				this.mutate(
					(s) => ({ ...s, playing: false, autoplayPaused: true }),
					'Autoplay paused after 30 minutes · Anyone can resume'
				);
				return;
			}

			if (this.autoplayStartedAt === null) {
				this.autoplayStartedAt = Date.now();
			}

			// Synchronously select the next related track without any pause or delay
			const related = getRelatedTrackSync(lastTrack, this.playedVideoIds);
			this.playedVideoIds.add(related.videoId);

			const nextTrack: Track = {
				uid: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				videoId: related.videoId,
				title: related.title,
				channel: related.channel,
				addedBy: 'Autoplay',
				source: 'youtube',
				url: `https://www.youtube.com/watch?v=${related.videoId}`,
				reactions: {}
			};

			this.mutate((s) => ({
				...s,
				queue: [],
				current: nextTrack,
				videoId: nextTrack.videoId,
				playlistId: null,
				source: 'youtube',
				playing: true,
				position: 0
			}));

			if (finished) this.writeLog(`finished “${finished}” · autoplaying “${nextTrack.title}”`);
			void this.ensureAutoplayQueued(nextTrack);
		}
	}

	/** Director heartbeat: refresh clock + position without changing seq. */
	heartbeat(position: number): void {
		this.mutate((s) => ({ ...s, position }), undefined, { keepSeq: true });
		if (this.isDirector() && this.state.playing && this.state.queue.length === 0 && this.state.current) {
			void this.ensureAutoplayQueued(this.state.current);
		}
	}

	/** Take over playback authority after the last director went quiet. */
	claim(position: number): void {
		this.mutate((s) => ({ ...s, position, playing: true }));
	}

	isDirector(): boolean {
		return (
			this.state.by === this.clientId ||
			(this.isHost && (!this.state.by || !this.peers.has(this.state.by)))
		);
	}

	roomUrl(): string {
		if (typeof location === 'undefined') return '';
		return `${location.origin}${location.pathname}${this.room ? `?room=${this.room}` : ''}`;
	}

	inviteUrl(slug: string): string {
		if (typeof location === 'undefined') return '';
		const clean = sanitizeRoom(slug);
		const base = `${location.origin}${location.pathname}?room=${clean}`;
		if (this.state.isPrivate || (clean === this.room && this.state.isPrivate)) {
			const key = this.accessKey || this.getSavedKey(clean);
			return key ? `${base}&key=${encodeURIComponent(key)}` : base;
		}
		return base;
	}

	getSavedKey(slug: string): string {
		if (typeof localStorage === 'undefined') return '';
		try {
			return localStorage.getItem('an.key.' + sanitizeRoom(slug)) || '';
		} catch {
			return '';
		}
	}

	async unlockWithKey(key: string): Promise<boolean> {
		const cleanKey = key.trim();
		if (!cleanKey || !this.room) return false;
		const h = await hashKey(cleanKey);
		if (this.state.accessKeyHash && h === this.state.accessKeyHash) {
			this.accessKey = cleanKey;
			this.activeKeyHash = h;
			try {
				localStorage.setItem('an.key.' + this.room, cleanKey);
			} catch {}
			this.admit();
			return true;
		}
		return false;
	}

	/* --------------------------------------------------------- housekeeping */

	private tick(): void {
		const now = Date.now();
		this.now = now;

		// Auto-archive when dawn is reached during an active overnight session
		// Every room must be archived after sunrise (none should stay active)
		if (
			this.isHost &&
			this.joinState === 'approved' &&
			this.room &&
			this.isDawn &&
			!this.dawnArchived
		) {
			this.dawnArchived = true;
			void this.archiveRoom();
		}

		// Track focus sprint minutes
		if (this.joinState === 'approved' && this.mode === 'focus') {
			this.focusSeconds++;
			if (this.focusSeconds >= 60) {
				this.focusSeconds = 0;
				try {
					recordStat('focusMinutes', 1);
				} catch {}
			}
		} else {
			this.focusSeconds = 0;
		}

		// Pomodoro automatic cycle transition by host
		if (this.isHost && this.state.cycleAuto && this.state.modeExpiresAt && now >= this.state.modeExpiresAt) {
			const nextMode = this.mode === 'focus' ? 'normal' : 'focus';
			const duration = nextMode === 'focus' ? 50 : 15;
			this.setMode(nextMode, duration);
		}

		for (const [id, peer] of this.peers) {
			if (id !== this.clientId && now - peer.ts > PRESENCE_TTL) {
				this.markAttendeeLeft(peer.name);
				this.peers.delete(id);
			}
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
		this.canonicalHost = '';
		this.roomStartedAt = 0;
		this.dawnArchived = false;
		this.state = emptyState();
		this.log = [];
		this.pending = [];
	}
}

export const room = new Room();
