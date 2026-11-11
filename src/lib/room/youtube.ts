const API_TIMEOUT_MS = 12_000;

let apiPromise: Promise<any> | null = null;

declare global {
	interface Window {
		YT?: any;
		onYouTubeIframeAPIReady?: () => void;
	}
}

export function loadYouTubeApi(): Promise<any> {
	if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
	if (window.YT?.Player) return Promise.resolve(window.YT);
	if (!apiPromise) {
		apiPromise = new Promise((resolve, reject) => {
			const previous = window.onYouTubeIframeAPIReady;
			window.onYouTubeIframeAPIReady = () => {
				previous?.();
				resolve(window.YT);
			};
			const script = document.createElement('script');
			script.src = 'https://www.youtube.com/iframe_api';
			script.async = true;
			script.onerror = () => {
				apiPromise = null;
				reject(new Error('YouTube API failed to load'));
			};
			document.head.appendChild(script);
			window.setTimeout(() => {
				if (!window.YT?.Player) {
					apiPromise = null;
					reject(new Error('YouTube API timed out'));
				}
			}, API_TIMEOUT_MS);
		});
	}
	return apiPromise;
}

/** Pull an 11-char video id out of anything a human might paste. */
export function parseYouTubeId(input: string): string | null {
	const raw = input.trim();
	if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;

	const candidates: string[] = [raw];
	if (!/^https?:\/\//i.test(raw) && raw.includes('.')) candidates.push('https://' + raw);

	for (const candidate of candidates) {
		let url: URL;
		try {
			url = new URL(candidate);
		} catch {
			continue;
		}
		const host = url.hostname.replace(/^www\./, '');
		if (host === 'youtu.be') {
			const id = url.pathname.split('/').filter(Boolean)[0];
			if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return id;
		}
		if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
			const v = url.searchParams.get('v');
			if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
			const match = url.pathname.match(/\/(shorts|live|embed)\/([A-Za-z0-9_-]{11})/);
			if (match) return match[2];
		}
	}
	return null;
}

export type VideoMeta = { title: string; channel: string };

/** Title + channel via YouTube's public oEmbed endpoint. Null on any failure. */
export async function fetchVideoMeta(id: string): Promise<VideoMeta | null> {
	try {
		const res = await fetch(
			`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`
		);
		if (!res.ok) return null;
		const data = (await res.json()) as { title?: string; author_name?: string };
		return { title: data.title ?? id, channel: data.author_name ?? 'YouTube' };
	} catch {
		return null;
	}
}

export function thumbnailFor(videoId: string): string {
	return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${String(s).padStart(2, '0')}`;
}

export type SpotifyMeta = {
	title: string;
	thumbnail?: string;
};

/** Fetch track title & details via Spotify oEmbed. */
export async function fetchSpotifyMeta(url: string): Promise<SpotifyMeta | null> {
	try {
		const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
		if (!res.ok) return null;
		const data = (await res.json()) as { title?: string; thumbnail_url?: string };
		if (!data.title) return null;
		return {
			title: data.title,
			thumbnail: data.thumbnail_url
		};
	} catch {
		return null;
	}
}

const PUBLIC_SEARCH_INSTANCES = [
	'https://yt.chocolatemoo53.com',
	'https://invidious.jing.rocks',
	'https://inv.vern.cc'
];

/** Search for a video on YouTube by title/artist to resolve external tracks. */
export async function searchYouTubeVideo(query: string): Promise<VideoMeta & { videoId: string } | null> {
	const clean = query.trim();
	if (!clean) return null;

	for (const instance of PUBLIC_SEARCH_INSTANCES) {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 4500);
			const res = await fetch(
				`${instance}/api/v1/search?q=${encodeURIComponent(clean)}&type=video`,
				{ signal: controller.signal }
			);
			clearTimeout(timeout);
			if (!res.ok) continue;
			const list = (await res.json()) as Array<{ videoId?: string; title?: string; author?: string }>;
			if (Array.isArray(list) && list.length > 0 && list[0].videoId) {
				return {
					videoId: list[0].videoId,
					title: list[0].title ?? clean,
					channel: list[0].author ?? 'YouTube'
				};
			}
		} catch {
			continue;
		}
	}
	return null;
}

export type PlaylistMeta = {
	title: string;
	channel: string;
	firstVideoId?: string;
	thumbnail?: string;
};

/** Fetch YouTube playlist title & metadata via oEmbed. */
export async function fetchPlaylistMeta(playlistId: string): Promise<PlaylistMeta | null> {
	try {
		const res = await fetch(
			`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/playlist?list=${playlistId}`)}&format=json`
		);
		if (!res.ok) return null;
		const data = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
		let firstVideoId: string | undefined;
		if (data.thumbnail_url) {
			const m = data.thumbnail_url.match(/\/vi\/([A-Za-z0-9_-]{11})\//);
			if (m) firstVideoId = m[1];
		}
		return {
			title: data.title ?? `YouTube Playlist`,
			channel: data.author_name ?? 'YouTube',
			firstVideoId,
			thumbnail: data.thumbnail_url
		};
	} catch {
		return null;
	}
}

/**
 * Uses a headless YouTube player to resolve all video IDs contained in a YouTube playlist.
 */
export function fetchPlaylistVideoIds(playlistId: string): Promise<string[]> {
	if (typeof window === 'undefined') return Promise.resolve([]);

	return new Promise((resolve) => {
		loadYouTubeApi()
			.then((YT) => {
				if (!YT?.Player) return resolve([]);

				const container = document.createElement('div');
				container.id = 'yt-playlist-resolver-' + Math.random().toString(36).slice(2, 8);
				container.style.cssText =
					'position:fixed;width:1px;height:1px;top:-9999px;left:-9999px;opacity:0.001;pointer-events:none;z-index:-1;';
				document.body.appendChild(container);

				let resolved = false;
				let pollInterval: any = null;
				let player: any = null;

				const cleanup = () => {
					if (pollInterval) clearInterval(pollInterval);
					try {
						player?.destroy?.();
					} catch {}
					try {
						container.remove();
					} catch {}
				};

				const finish = (ids: string[]) => {
					if (resolved) return;
					resolved = true;
					clearTimeout(timeout);
					cleanup();
					resolve(ids);
				};

				const timeout = setTimeout(() => {
					try {
						const ids = player?.getPlaylist?.();
						if (Array.isArray(ids) && ids.length > 0) {
							finish(ids);
							return;
						}
					} catch {}
					finish([]);
				}, 6500);

				try {
					player = new YT.Player(container, {
						height: '1',
						width: '1',
						playerVars: {
							listType: 'playlist',
							list: playlistId,
							autoplay: 0,
							controls: 0,
							disablekb: 1,
							fs: 0
						},
						events: {
							onReady: (e: any) => {
								try {
									const list = e.target.getPlaylist?.();
									if (Array.isArray(list) && list.length > 0) {
										finish(list);
										return;
									}
									e.target.cuePlaylist?.({ list: playlistId, listType: 'playlist' });
								} catch {}

								pollInterval = setInterval(() => {
									try {
										const list = player?.getPlaylist?.();
										if (Array.isArray(list) && list.length > 0) {
											finish(list);
										}
									} catch {}
								}, 200);
							},
							onStateChange: (e: any) => {
								try {
									const list = e.target.getPlaylist?.();
									if (Array.isArray(list) && list.length > 0) {
										finish(list);
									}
								} catch {}
							},
							onError: () => finish([])
						}
					});
				} catch {
					finish([]);
				}
			})
			.catch(() => resolve([]));
	});
}

export type PlaylistTrackItem = {
	videoId: string;
	title: string;
	channel: string;
};

/**
 * Resolves a full YouTube playlist into individual track items with metadata.
 */
export async function fetchPlaylistTracks(
	playlistId: string,
	firstVideoId?: string | null
): Promise<PlaylistTrackItem[]> {
	const metaPromise = fetchPlaylistMeta(playlistId);
	const idsPromise = fetchPlaylistVideoIds(playlistId);

	const [meta, rawIds] = await Promise.all([metaPromise, idsPromise]);

	let ids = [...rawIds];
	if (firstVideoId && !ids.includes(firstVideoId)) {
		ids.unshift(firstVideoId);
	} else if (firstVideoId && ids.includes(firstVideoId)) {
		const idx = ids.indexOf(firstVideoId);
		if (idx > 0) {
			// Put selected video first, followed by remainder of the playlist
			ids = [...ids.slice(idx), ...ids.slice(0, idx)];
		}
	} else if (meta?.firstVideoId && !ids.includes(meta.firstVideoId)) {
		ids.unshift(meta.firstVideoId);
	}

	if (ids.length === 0) {
		const singleId = firstVideoId || meta?.firstVideoId;
		if (singleId) {
			const singleMeta = await fetchVideoMeta(singleId);
			return [
				{
					videoId: singleId,
					title: singleMeta?.title ?? meta?.title ?? `YouTube Track (${singleId})`,
					channel: singleMeta?.channel ?? meta?.channel ?? 'YouTube'
				}
			];
		}
		return [];
	}

	// Limit to max 50 tracks to keep room sync swift and reliable
	const targetIds = ids.slice(0, 50);
	const tracks: PlaylistTrackItem[] = [];

	// Fetch titles in parallel batches of 6
	const batchSize = 6;
	for (let i = 0; i < targetIds.length; i += batchSize) {
		const chunk = targetIds.slice(i, i + batchSize);
		const metas = await Promise.all(
			chunk.map(async (vid) => {
				try {
					return await fetchVideoMeta(vid);
				} catch {
					return null;
				}
			})
		);
		chunk.forEach((vid, idx) => {
			const m = metas[idx];
			tracks.push({
				videoId: vid,
				title: m?.title ?? `${meta?.title ?? 'Track'} #${i + idx + 1}`,
				channel: m?.channel ?? meta?.channel ?? 'YouTube'
			});
		});
	}

	return tracks;
}

/**
 * Permanently banned tracks from ever appearing in autoplay, fallbacks, or room playback
 */
export const BANNED_VIDEO_IDS = new Set([
	'4xDzrJKXOOY', // Lofi Girl - Synthwave Radio
	'rUxyKA_-Mg4', // Synthwave Radio - Chill Synth / Retro Beats
	'jfKfPfyJRdk', // lofi hip hop radio
	'5qap5aO4i9A', // lofi sleep radio
	'DWcJFNfaw9c', // Chillhop Radio
	'kgx4WGK0oNU', // Coffee Shop Radio
	'7NOSDKb0HlU', // peaceful piano radio
	'WPni755-Krg'  // Midnight Jazz Lounge
]);

export function isBannedMusic(videoId?: string | null, title?: string, duration?: number): boolean {
	if (videoId && BANNED_VIDEO_IDS.has(videoId)) return true;
	if (typeof duration === 'number' && duration > 1800) return true; // Never autoplay tracks over 30 minutes
	if (!title) return false;
	const t = title.toLowerCase();
	return (
		/cultural|bahilawi|traditional|eskista|masenqo|kirar\s*folk|lofi|lo-fi|chillhop|study\s*(beats|session|with\s*me)|relax(ing)?\s*beats|piano\s*radio|classical|instrumental(\s*only)?|bgm|sleep(ing)?\s*music|meditation|ambient\s*sound|\b(1|2|3|4|5|6|8|10|12|24)\s*hours?|\bnon[\s-]*stop|\bcompilation|\bfull\s*album|\bjukebox/i.test(
			t
		)
	);
}

export type MusicLanguage = 'amharic' | 'tigrinya' | 'english';

/**
 * Detects whether a track is Amharic, Ethiopian Tigrinya, or English / International music.
 */
export function detectMusicLanguage(
	track?: { title?: string; channel?: string; genre?: string } | null
): MusicLanguage {
	if (!track) return 'english';
	const title = (track.title ?? '').toLowerCase();
	const channel = (track.channel ?? '').toLowerCase();
	const genre = (track.genre ?? '').toLowerCase();
	const combined = `${title} ${channel} ${genre}`;

	// Check Ethiopian Tigrinya indicators first
	const isTigrinya =
		/tigrinya|tigrigna|tigrina|tigray|mekelle|dawit\s*nega|abraham\s*gebremedhin|abreham\s*g\/medhin|kiros\s*alemayehu|eden\s*gebreselasie|gidey\s*gebremedhin|haftu\s*zeferu|tesfay\s*gomera|teklemariam|yemane\s*barya|aytekaelen|fetiki/i.test(
			combined
		) || /[\u1250-\u1256\u1318-\u131F]/.test(combined);

	if (isTigrinya) return 'tigrinya';

	// Check Amharic 90s / Ethiopian modern pop indicators or Ge'ez script
	const isAmharic =
		/amharic|ethiopian|ethiopia|addis|ephrem\s*tamiru|aster\s*aweke|tamrat\s*desta|tilahun\s*gessesse|tlahoun|aregahegn\s*worash|kuku\s*sebsebe|girma\s*tefera|teddy\s*afro|michael\s*belayneh|belayneh|rophnan|dawit\s*tsige|neway\s*damtie|gosaye|zeritu|eyob\s*mekonnen|hope\s*music|minew\s*shewa|sewasew|nahom/i.test(
			combined
		) || /[\u1200-\u137F]/.test(combined);

	if (isAmharic) return 'amharic';

	return 'english';
}

export type CuratedTrack = {
	videoId: string;
	title: string;
	channel: string;
	language: MusicLanguage;
	tags: string[];
};

export const CURATED_CATALOG: CuratedTrack[] = [
	// ================= 90s AMHARIC MODERN POP (No Cultural Folk) =================
	{
		videoId: 'WD_IDsP3sbY',
		title: 'Ephrem Tamiru - Demamaye',
		channel: 'Ephrem Tamiru',
		language: 'amharic',
		tags: ['ephrem tamiru', 'demamaye', '90s', 'amharic', 'ethiopian', 'pop']
	},
	{
		videoId: 'vgybg--StKc',
		title: 'Tamrat Desta - Hakime Nesh',
		channel: 'Tamrat Desta',
		language: 'amharic',
		tags: ['tamrat desta', 'hakime nesh', '90s', 'amharic', 'ethiopian', 'love']
	},
	{
		videoId: 'ULgwcno7gZs',
		title: 'Aster Aweke - Nafkot',
		channel: 'Aster Aweke',
		language: 'amharic',
		tags: ['aster aweke', 'nafkot', '90s', 'amharic', 'ethiopian']
	},
	{
		videoId: '1geU0Xo4sns',
		title: 'Tilahun Gessesse - Kulun Manqualesh',
		channel: 'Tilahun Gessesse',
		language: 'amharic',
		tags: ['tilahun gessesse', 'kulun manqualesh', 'amharic', 'ethiopian', 'classic']
	},
	{
		videoId: '-RfFt4nkl5g',
		title: 'Michael Belayneh - Teneta',
		channel: 'Michael Belayneh',
		language: 'amharic',
		tags: ['michael belayneh', 'belayneh', 'teneta', 'amharic', 'ethiopian']
	},
	{
		videoId: 'VsrL9Rz-A5A',
		title: 'Teddy Afro - ETHIOPIA',
		channel: 'Teddy Afro',
		language: 'amharic',
		tags: ['teddy afro', 'ethiopia', 'amharic', 'ethiopian']
	},

	// ================= ETHIOPIAN TIGRINYA MUSIC (Mainly Ethiopian Tigrinya, No Folk) =================
	{
		videoId: 'mMUzrTXQPJg',
		title: 'Dawit Nega - Ajoki Tigray',
		channel: 'Dawit Nega',
		language: 'tigrinya',
		tags: ['dawit nega', 'ajoki', 'ethiopian tigrigna', 'tigray', 'ethiopia', 'music']
	},
	{
		videoId: '4wadY4IbRa4',
		title: 'Dawit Nega - Wezamey',
		channel: 'Dawit Nega',
		language: 'tigrinya',
		tags: ['dawit nega', 'wezamey', 'ethiopian tigrigna', 'tigray', 'ethiopia']
	},
	{
		videoId: 'AQzD-j8017g',
		title: 'Abreham G/Medhin – Hamelmalo',
		channel: 'Abreham G/Medhin',
		language: 'tigrinya',
		tags: ['abraham gebremedhin', 'hamelmalo', 'ethiopian tigrigna', 'tigray', 'ethiopia']
	},

	// ================= ENGLISH HIT MUSIC (Real Vocal Pop/Electronic) =================
	{
		videoId: '4NRXx6U8ABQ',
		title: 'The Weeknd - Blinding Lights',
		channel: 'The Weeknd',
		language: 'english',
		tags: ['the weeknd', 'blinding lights', 'english', 'pop', 'synth']
	},
	{
		videoId: '1-xGerv5FOk',
		title: 'Alan Walker - Alone',
		channel: 'Alan Walker',
		language: 'english',
		tags: ['alan walker', 'alone', 'english', 'electronic', 'edm']
	},
	{
		videoId: '60ItHLz5WEA',
		title: 'Alan Walker - Faded',
		channel: 'Alan Walker',
		language: 'english',
		tags: ['alan walker', 'faded', 'english', 'electronic']
	},
	{
		videoId: '34Na4j8AVgA',
		title: 'The Weeknd ft. Daft Punk - Starboy',
		channel: 'The Weeknd',
		language: 'english',
		tags: ['the weeknd', 'starboy', 'daft punk', 'english', 'pop']
	},
	{
		videoId: 'UtF6Jej8yb4',
		title: 'Avicii - The Nights',
		channel: 'Avicii',
		language: 'english',
		tags: ['avicii', 'the nights', 'english', 'dance', 'anthem']
	},
	{
		videoId: 'dX3k_QDnzHE',
		title: 'M83 - Midnight City',
		channel: 'M83',
		language: 'english',
		tags: ['m83', 'midnight city', 'english', 'indie', 'electronic']
	}
];

/** Score and find similar tracks from the curated catalog based on language, artist, and title. */
export function getSimilarCuratedTracks(
	currentTrack?: { videoId?: string | null; title?: string; channel?: string; genre?: string } | null,
	playedVideoIds: Set<string> = new Set(),
	count = 4
): Array<{ videoId: string; title: string; channel: string; label: string; language: MusicLanguage }> {
	const currentVid = currentTrack?.videoId ?? '';
	const targetLang = detectMusicLanguage(currentTrack);
	const titleLower = (currentTrack?.title ?? '').toLowerCase();
	const channelLower = (currentTrack?.channel ?? '').toLowerCase();

	// Extract keyword tokens
	const combinedTokens = `${titleLower} ${channelLower}`
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter((t) => t.length > 2);

	// STRICT LANGUAGE FILTER: Only pick songs of the same language
	const languageCatalog = CURATED_CATALOG.filter((item) => item.language === targetLang);

	const scored = languageCatalog.map((item) => {
		if (item.videoId === currentVid || isBannedMusic(item.videoId, item.title)) {
			return { item, score: -1 };
		}

		let score = 20; // Base score for matching language

		// Deprioritize tracks already played in this room session
		if (playedVideoIds.has(item.videoId)) {
			score -= 50;
		}

		const itemChannel = item.channel.toLowerCase();
		const itemTitle = item.title.toLowerCase();

		// Artist / Channel match (e.g. Michael Belayneh -> Michael Belayneh)
		if (
			(channelLower && itemChannel.includes(channelLower)) ||
			(channelLower && channelLower.includes(itemChannel)) ||
			(titleLower && itemChannel.length > 3 && titleLower.includes(itemChannel))
		) {
			score += 60;
		}

		// Token matching against tags and title
		for (const token of combinedTokens) {
			if (item.tags.some((tag) => tag.includes(token) || token.includes(tag))) {
				score += 15;
			}
			if (itemTitle.includes(token)) {
				score += 10;
			}
		}

		return { item, score };
	});

	// Sort highest score first
	scored.sort((a, b) => b.score - a.score);

	const results = scored
		.filter((s) => s.score >= 0)
		.slice(0, count)
		.map(({ item }) => {
			let label = item.title;
			if (label.includes(' - ')) {
				label = label.split(' - ')[1].trim();
			} else if (label.length > 22) {
				label = label.slice(0, 20) + '…';
			}
			return {
				videoId: item.videoId,
				title: `${item.channel} - ${item.title}`,
				channel: item.channel,
				label,
				language: item.language
			};
		});

	// If all were played or filtered, return any track in the same language
	if (results.length === 0) {
		return languageCatalog
			.filter((c) => c.videoId !== currentVid && !isBannedMusic(c.videoId, c.title))
			.slice(0, count)
			.map((item) => ({
				videoId: item.videoId,
				title: `${item.channel} - ${item.title}`,
				channel: item.channel,
				label: item.title.slice(0, 20),
				language: item.language
			}));
	}

	return results;
}

/**
 * Returns dynamic track suggestions based on the last played / current music.
 * Used in QueuePanel quick pills and Autoplay previews.
 */
export function getSuggestedTracks(
	currentTrack?: { videoId?: string | null; title?: string; channel?: string; genre?: string } | null,
	playedVideoIds: Set<string> = new Set(),
	count = 3
): Array<{ label: string; title: string; channel: string; videoId: string; language: MusicLanguage }> {
	return getSimilarCuratedTracks(currentTrack, playedVideoIds, count);
}

/**
 * Fast Invidious video recommendation lookup with strict 1.2s timeout.
 */
async function fetchInvidiousRecommended(
	videoId: string
): Promise<Array<{ videoId: string; title: string; channel: string }>> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 1200);
		const res = await fetch(`https://yt.chocolatemoo53.com/api/v1/videos/${videoId}`, {
			signal: controller.signal
		});
		clearTimeout(timeout);
		if (!res.ok) return [];
		const data = await res.json();
		if (Array.isArray(data.recommendedVideos) && data.recommendedVideos.length > 0) {
			return data.recommendedVideos
				.filter((v: any) => v.videoId && !isBannedMusic(v.videoId, v.title))
				.map((v: any) => ({
					videoId: v.videoId,
					title: v.title ?? 'Related Track',
					channel: v.author ?? 'YouTube'
				}));
		}
	} catch {}
	return [];
}

/**
 * Resolves a related YouTube track when the room queue has finished playing.
 * - If last track was Amharic -> autoplays Amharic!
 * - If last track was Tigrinya -> autoplays Tigrinya!
 * - If last track was English -> autoplays English!
 * - Strictly filters out lofi, classical, study sessions, and 1h+ compilations.
 */
export async function getRelatedYouTubeTrack(
	currentTrack?: { videoId?: string | null; title?: string; channel?: string; genre?: string } | null,
	playedVideoIds: Set<string> = new Set()
): Promise<{ videoId: string; title: string; channel: string; language?: MusicLanguage }> {
	const currentVid = currentTrack?.videoId;
	const targetLang = detectMusicLanguage(currentTrack);

	// 1. Fast online recommendations if videoId exists (1.2s timeout)
	if (currentVid) {
		try {
			const recommended = await fetchInvidiousRecommended(currentVid);
			const matching = recommended.find(
				(r) =>
					r.videoId !== currentVid &&
					!playedVideoIds.has(r.videoId) &&
					!isBannedMusic(r.videoId, r.title) &&
					detectMusicLanguage(r) === targetLang
			);
			if (matching) {
				return {
					...matching,
					language: targetLang
				};
			}
		} catch {}
	}

	// 2. Similarity-matched curated track based strictly on language & artist (instant)
	const suggestions = getSimilarCuratedTracks(currentTrack, playedVideoIds, 4);
	if (suggestions.length > 0) {
		return suggestions[0];
	}

	// 3. Fallback based strictly on the detected language (cycling candidates to prevent repeats)
	const fallbacks: Record<MusicLanguage, Array<{ videoId: string; title: string; channel: string }>> = {
		amharic: [
			{ videoId: 'WD_IDsP3sbY', title: 'Ephrem Tamiru - Demamaye', channel: 'Ephrem Tamiru' },
			{ videoId: 'vgybg--StKc', title: 'Tamrat Desta - Hakime Nesh', channel: 'Tamrat Desta' },
			{ videoId: 'ULgwcno7gZs', title: 'Aster Aweke - Nafkot', channel: 'Aster Aweke' },
			{ videoId: '1geU0Xo4sns', title: 'Tilahun Gessesse - Kulun Manqualesh', channel: 'Tilahun Gessesse' },
			{ videoId: '-RfFt4nkl5g', title: 'Michael Belayneh - Teneta', channel: 'Michael Belayneh' },
			{ videoId: 'VsrL9Rz-A5A', title: 'Teddy Afro - ETHIOPIA', channel: 'Teddy Afro' }
		],
		tigrinya: [
			{ videoId: 'mMUzrTXQPJg', title: 'Dawit Nega - Ajoki Tigray', channel: 'Dawit Nega' },
			{ videoId: '4wadY4IbRa4', title: 'Dawit Nega - Wezamey', channel: 'Dawit Nega' },
			{ videoId: 'AQzD-j8017g', title: 'Abreham G/Medhin – Hamelmalo', channel: 'Abraham Gebremedhin' }
		],
		english: [
			{ videoId: '4NRXx6U8ABQ', title: 'The Weeknd - Blinding Lights', channel: 'The Weeknd' },
			{ videoId: '1-xGerv5FOk', title: 'Daft Punk - Get Lucky', channel: 'Daft Punk' },
			{ videoId: '60ItHLz5WEA', title: 'Alan Walker - Faded', channel: 'Alan Walker' },
			{ videoId: '34Na4j8AVgA', title: 'The Weeknd - Starboy', channel: 'The Weeknd' }
		]
	};

	const list = fallbacks[targetLang] || fallbacks.english;
	const picked =
		list.find((c) => c.videoId !== currentVid && !playedVideoIds.has(c.videoId)) ||
		list.find((c) => c.videoId !== currentVid) ||
		list[0];

	return {
		...picked,
		language: targetLang
	};
}

