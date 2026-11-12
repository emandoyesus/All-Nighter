import { supabase, isSupabaseConfigured } from '#lib/supabase';
import type { ChatMessage, Track, RoomState } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface DbRoom {
	id: string;
	slug: string;
	title: string;
	host_id: string;
	host_name: string;
	status: 'active' | 'archived' | 'closed';
	dawn_target: string;
	created_at: string;
	playback_state: any;
}

export interface DbMessage {
	id: string;
	room_slug: string;
	sender_id: string;
	sender_name: string;
	text: string;
	kind: string;
	created_at: string;
}

export interface DbQueueItem {
	id: string;
	room_slug: string;
	video_id: string;
	source: string;
	title: string;
	channel?: string;
	added_by: string;
	position: number;
}

/**
 * Supabase Room Database & Realtime Adapter
 * Synchronizes room sessions, persistent chat history, and shared queue with PostgreSQL.
 */
export class SupabaseRoomSync {
	private channel: RealtimeChannel | null = null;
	private roomSlug: string = '';

	constructor(
		private onRemoteMessage: (msg: ChatMessage) => void,
		private onRemoteQueue: (queue: Track[]) => void,
		private onRemoteState?: (state: Partial<RoomState>) => void,
		private onHostConfirmed?: (isHost: boolean, canonicalHostName?: string) => void
	) {}

	/** Check if database connection is configured */
	get isEnabled(): boolean {
		return isSupabaseConfigured && Boolean(supabase);
	}

	/** Join a room channel and fetch persistent history */
	async attachRoom(slug: string, title: string, hostId: string, hostName: string): Promise<void> {
		if (!this.isEnabled || !supabase) return;
		this.roomSlug = slug;

		// 1. Ensure room record exists in database
		try {
			const { data: existing } = await supabase
				.from('rooms')
				.select('*')
				.eq('slug', slug)
				.maybeSingle();

			if (existing) {
				const isHostUser = Boolean(
					(hostId && existing.host_id === hostId) ||
					(!existing.host_id && hostName && existing.host_name === hostName)
				);
				this.onHostConfirmed?.(isHostUser, existing.host_name || '');
			} else {
				this.onHostConfirmed?.(Boolean(hostId || hostName), hostName || '');
				await supabase.from('rooms').upsert(
					{
						slug,
						title: title || slug,
						host_id: hostId,
						host_name: hostName,
						status: 'active'
					},
					{ onConflict: 'slug' }
				);
			}
		} catch (err) {
			console.warn('[Supabase] Failed to upsert room:', err);
		}

		// 2. Fetch persistent chat messages (most recent 100)
		try {
			const { data: messages } = await supabase
				.from('messages')
				.select('*')
				.eq('room_slug', slug)
				.order('created_at', { ascending: true })
				.limit(100);

			if (messages && messages.length > 0) {
				for (const m of messages) {
					this.onRemoteMessage({
						id: m.id,
						who: m.sender_name,
						whoId: m.sender_id,
						text: m.text,
						ts: new Date(m.created_at).getTime()
					});
				}
			}
		} catch (err) {
			console.warn('[Supabase] Failed to fetch messages:', err);
		}

		// 3. Fetch persistent queue items
		try {
			const { data: queueItems } = await supabase
				.from('queue_items')
				.select('*')
				.eq('room_slug', slug)
				.order('position', { ascending: true });

			if (queueItems && queueItems.length > 0) {
				const queue: Track[] = queueItems.map((q) => ({
					uid: q.id,
					videoId: q.video_id,
					source: q.source as any,
					title: q.title,
					channel: q.channel,
					addedBy: q.added_by
				}));
				this.onRemoteQueue(queue);
			}
		} catch (err) {
			console.warn('[Supabase] Failed to fetch queue:', err);
		}

		// 4. Subscribe to Realtime postgres_changes
		this.unsubscribe();
		this.channel = supabase
			.channel(`room_${slug}`)
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'messages', filter: `room_slug=eq.${slug}` },
				(payload) => {
					const m = payload.new as DbMessage;
					this.onRemoteMessage({
						id: m.id,
						who: m.sender_name,
						whoId: m.sender_id,
						text: m.text,
						ts: new Date(m.created_at).getTime()
					});
				}
			)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'queue_items', filter: `room_slug=eq.${slug}` },
				async () => {
					// Refresh queue on any remote queue changes
					const { data: freshQueue } = await supabase!
						.from('queue_items')
						.select('*')
						.eq('room_slug', slug)
						.order('position', { ascending: true });

					if (freshQueue) {
						this.onRemoteQueue(
							freshQueue.map((q) => ({
								uid: q.id,
								videoId: q.video_id,
								source: q.source as any,
								title: q.title,
								channel: q.channel,
								addedBy: q.added_by
							}))
						);
					}
				}
			)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'rooms', filter: `slug=eq.${slug}` },
				(payload) => {
					const updatedRoom = payload.new as DbRoom;
					if (updatedRoom?.playback_state && this.onRemoteState) {
						this.onRemoteState(updatedRoom.playback_state);
					}
				}
			)
			.subscribe();
	}

	/** Persist chat message in Supabase */
	async saveMessage(msg: ChatMessage): Promise<void> {
		if (!this.isEnabled || !supabase || !this.roomSlug) return;
		try {
			await supabase.from('messages').insert({
				id: msg.id,
				room_slug: this.roomSlug,
				sender_id: msg.whoId || 'anon',
				sender_name: msg.who,
				text: msg.text,
				kind: 'chat'
			});
		} catch (err) {
			console.warn('[Supabase] Failed to save chat:', err);
		}
	}

	/** Persist full collaborative queue state in Supabase */
	async syncQueue(queue: Track[]): Promise<void> {
		if (!this.isEnabled || !supabase || !this.roomSlug) return;
		try {
			// Clear existing items and repopulate with current ordered positions
			await supabase.from('queue_items').delete().eq('room_slug', this.roomSlug);
			if (queue.length > 0) {
				const rows = queue.map((t, idx) => ({
					id: t.uid,
					room_slug: this.roomSlug,
					video_id: t.videoId || '',
					source: t.source || 'youtube',
					title: t.title,
					channel: t.channel || '',
					added_by: t.addedBy,
					position: idx
				}));
				await supabase.from('queue_items').insert(rows);
			}
		} catch (err) {
			console.warn('[Supabase] Failed to sync queue:', err);
		}
	}

	/** Persist room playback state */
	async savePlayback(state: Partial<RoomState>): Promise<void> {
		if (!this.isEnabled || !supabase || !this.roomSlug) return;
		try {
			await supabase
				.from('rooms')
				.update({
					playback_state: state
				})
				.eq('slug', this.roomSlug);
		} catch (err) {
			console.warn('[Supabase] Failed to save playback state:', err);
		}
	}

	/** Archive the completed night session into the database at dawn */
	async archiveSession(summaryData: {
		slug: string;
		title: string;
		startedAt: string;
		attendees: string[];
		playlist: any[];
		summary?: string;
	}): Promise<void> {
		if (!this.isEnabled || !supabase) return;
		try {
			await supabase.from('session_archives').insert(
				{
					slug: summaryData.slug,
					title: summaryData.title,
					started_at: summaryData.startedAt,
					ended_at: new Date().toISOString(),
					attendees: summaryData.attendees,
					playlist: summaryData.playlist,
					summary: summaryData.summary || ''
				}
			);

			// Mark room status as archived
			await supabase
				.from('rooms')
				.update({ status: 'archived', closed_at: new Date().toISOString() })
				.eq('slug', summaryData.slug);
		} catch (err) {
			console.warn('[Supabase] Failed to archive session:', err);
		}
	}

	/** Clean up active realtime channel subscription */
	unsubscribe(): void {
		if (this.channel && supabase) {
			supabase.removeChannel(this.channel);
			this.channel = null;
		}
	}
}
