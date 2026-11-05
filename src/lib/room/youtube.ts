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

