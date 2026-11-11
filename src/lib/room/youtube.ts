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
		/news|ዜና|ዜናታት|asena|atv|tdf|war|military|ኣጽዋር|ጦርነት|ፖለቲካ|politics|interview|መግለጺ|መግለፂ|መሰረት|speech|breaking|update|report|podcast|talk\s*show|documentary|ወቅታዊ|ድምጺ\s*ወያነ|dw\s*international|tigrai\s*tv|tmh|dimtsi\s*weyane|ebc|fana|walta|zehabesha|mereja|andafta|esat|asham|zara\s*media|abbay\s*media|fetash|ethiopia\s*today|sheger\s*fm|balageru\s*tv|nahoo|arts\s*tv|hossana|prophecy|press\s*release|orthodox|mezmur|tewahdo|islamic|dawa|quran|preaching|sermon|gospel|መንፈሳዊ|drama|movie|film|ድራማ|ፊልም|ክፍሊ|cultural|bahilawi|traditional|eskista|masenqo|kirar\s*folk|ባህላዊ|እስክስታ|ማሲንቆ|አዝማሪ|lofi|lo-fi|chillhop|study\s*(beats|session|with\s*me)|relax(ing)?\s*beats|piano\s*radio|classical|instrumental(\s*only)?|bgm|sleep(ing)?\s*music|meditation|ambient\s*sound|\b(1|2|3|4|5|6|8|10|12|24)\s*hours?|\bnon[\s-]*stop|\bcompilation|\bfull\s*album|\bjukebox/i.test(
			t
		)
	);
}

export type MusicLanguage = 'amharic' | 'tigrinya' | 'english';

/**
 * Detects whether a track is Amharic, Ethiopian Tigrinya, or English / International music.
 */
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
		/tigrinya|tigrigna|tigrina|tigray|mekelle|dawit\s*nega|abraham\s*gebremedhin|abreham\s*g\/medhin|kiros\s*alemayehu|eden\s*gebreselasie|gidey\s*gebremedhin|haftu\s*zeferu|tesfay\s*gomera|teklemariam|yemane\s*barya|aytekaelen|fetiki|merkeb\s*bonitua|solomon\s*haile|zemen\s*alemseged|tmnit\s*welday|timnit\s*welday|mahlet\s*gebrezgiaber|amir\s*dawud|dawit\s*alemayehu|nahom\s*yohannes|ephrem\s*amare|rahel\s*haile|mesfin\s*berhanu|shewit\s*mezgebo|neguse\s*abadi|anbessa\s*tekle|hermon\s*baraki|alula\s*mampa|tesfaye\s*gebre|freselam\s*mussie|estifanos\s*abraham|amanuel\s*yemane|robel\s*michael|solomon\s*bayre/i.test(
			combined
		) || /[\u1250-\u1256\u1318-\u131F]/.test(combined);

	if (isTigrinya) return 'tigrinya';

	// Check Amharic 90s / Ethiopian modern pop indicators or Ge'ez script
	const isAmharic =
		/amharic|ethiopian|ethiopia|addis|ephrem\s*tamiru|aster\s*aweke|tamrat\s*desta|tilahun\s*gessesse|tlahoun|aregahegn\s*worash|kuku\s*sebsebe|girma\s*tefera|teddy\s*afro|michael\s*belayneh|belayneh|rophnan|dawit\s*tsige|neway\s*damtie|gosaye|zeritu|eyob\s*mekonnen|hope\s*music|minew\s*shewa|sewasew|nahom|mahmoud\s*ahmed|muluken\s*melesse|abinet\s*agonafir|abdu\s*kiar|abdu\s*kiyar|gigi\s*shibabaw|bizunesh\s*bekele|alemayehu\s*eshete|hirut\s*bekele|betty\s*g|tsegaye\s*eshetu|tsedenia\s*gebremarkos|dagi\s*dagne|dag\s*daniel|bisrat\s*surafel|dereje\s*dubale|alex\s*olympia|alex\s*olompia|fitsum\s*t|haimanot\s*girma|hamelmal\s*abate|helen\s*berhe|lij\s*michael|tsehaye\s*yohannes|tibebu\s*workiye/i.test(
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
	{
		videoId: 'xE-9kJOPbxE',
		title: 'Teddy Afro - Teddy Afro - Alamin [Official Video]',
		channel: 'Teddy Afro',
		language: 'amharic',
		tags: ['teddy afro', 'amharic', 'music']
	},
	{
		videoId: '581JQIgckzo',
		title: 'Aster Aweke - Aster Aweke - Bale Gariw | አስቴር አወቀ - ባለ ጋሪው ',
		channel: 'Aster Aweke',
		language: 'amharic',
		tags: ['aster aweke', 'amharic', 'music']
	},
	{
		videoId: 'UD0fA2WJdbU',
		title: 'Tilahun Gessesse - Tilahun Gessesse - Kome Limerkish | ቆሜ ልመርቅሽ ',
		channel: 'Tilahun Gessesse',
		language: 'amharic',
		tags: ['tilahun gessesse', 'amharic', 'music']
	},
	{
		videoId: 'exHYkiFkbHU',
		title: 'Mahmoud Ahmed - Mahmoud Ahmed - Yeshi Hargetu',
		channel: 'Mahmoud Ahmed',
		language: 'amharic',
		tags: ['mahmoud ahmed', 'amharic', 'music']
	},
	{
		videoId: 'nDGUOFzxMl0',
		title: 'Muluken Melesse - Muluken Melesse - Baynish Lilefibet (ባይንሽ ልለፍ',
		channel: 'Muluken Melesse',
		language: 'amharic',
		tags: ['muluken melesse', 'amharic', 'music']
	},
	{
		videoId: 'UjidhLKXA_g',
		title: 'Abinet Agonafir - Abinet Agonafir አብነት አጎናፍር | የእውነት መንገድ | Yew',
		channel: 'Abinet Agonafir',
		language: 'amharic',
		tags: ['abinet agonafir', 'amharic', 'music']
	},
	{
		videoId: '3saR6DZGfNU',
		title: 'Dawit Tsige - Dawit Tsige - እትቱ | Etitu (Official Concert M',
		channel: 'Dawit Tsige',
		language: 'amharic',
		tags: ['dawit tsige', 'amharic', 'music']
	},
	{
		videoId: 'dKMF0WkBD9o',
		title: 'Abdu Kiar - Ethiopian Music : Abdu Kiar & Melat Kelemewor',
		channel: 'Abdu Kiar',
		language: 'amharic',
		tags: ['abdu kiar', 'amharic', 'music']
	},
	{
		videoId: 'yKlol9zuE5s',
		title: 'Gossaye Tesfaye - Gossaye Tesfaye - Kurfiyaw | ጎሳዬ ተስፋዬ - ኩርፊያው',
		channel: 'Gossaye Tesfaye',
		language: 'amharic',
		tags: ['gossaye tesfaye', 'amharic', 'music']
	},
	{
		videoId: 'vDLWIZamLwI',
		title: 'Gigi Shibabaw - ገላ -እጅጋየሁ ሽባባው(ጂጂ)-ግጥም(Lyrics)  -(Abugida Lyr',
		channel: 'Gigi Shibabaw',
		language: 'amharic',
		tags: ['gigi shibabaw', 'amharic', 'music']
	},
	{
		videoId: 'kzXPkoD3Lwg',
		title: 'Ephrem Tamiru - Ephrem Tamiru - Akale - ኤፍሬም ታምሩ - አካሌ - Ethi',
		channel: 'Ephrem Tamiru',
		language: 'amharic',
		tags: ['ephrem tamiru', 'amharic', 'music']
	},
	{
		videoId: 'd8BdXzg9AMQ',
		title: 'Bizunesh Bekele - Bizunesh Bekele - Timeless Ethiopian Oldies',
		channel: 'Bizunesh Bekele',
		language: 'amharic',
		tags: ['bizunesh bekele', 'amharic', 'music']
	},
	{
		videoId: 'iPMwz3brdek',
		title: 'Alemayehu Eshete - Alteleyeshignim Alemayehu Eshete | አልተለየሽኝም -',
		channel: 'Alemayehu Eshete',
		language: 'amharic',
		tags: ['alemayehu eshete', 'amharic', 'music']
	},
	{
		videoId: 'tG0YD68vKtI',
		title: 'Hirut Bekele - ሂሩት በቀለ - ስምህን አውሰኝ  New Ethiopian Music 2026',
		channel: 'Hirut Bekele',
		language: 'amharic',
		tags: ['hirut bekele', 'amharic', 'music']
	},
	{
		videoId: 'kUknTOgdWgk',
		title: 'Rophnan - ROPHNAN - SHEGIYE | ሮፍናን - ሸግዬ',
		channel: 'Rophnan',
		language: 'amharic',
		tags: ['rophnan', 'amharic', 'music']
	},
	{
		videoId: 'o2o6V5YwDrU',
		title: 'Michael Belayneh - Michael Belayneh - የፍቅር ምርጫዬ  _ Yefkr Mirchay',
		channel: 'Michael Belayneh',
		language: 'amharic',
		tags: ['michael belayneh', 'amharic', 'music']
	},
	{
		videoId: 'HZnfRwFKCO8',
		title: 'Betty G - Betty G - Na Na Demaye [NEW! Music Video 2015',
		channel: 'Betty G',
		language: 'amharic',
		tags: ['betty g', 'amharic', 'music']
	},
	{
		videoId: '0x7fRqgq3dk',
		title: 'Tsegaye Eshetu - Tsegaye Eshetu -  እሄዳለሁ ባቡር ተሳፍሬ  Ethiopia Ol',
		channel: 'Tsegaye Eshetu',
		language: 'amharic',
		tags: ['tsegaye eshetu', 'amharic', 'music']
	},
	{
		videoId: 'faXPu5_Y3Cs',
		title: 'Eyob Mekonnen - Eyob Mekonnen - Yewnetwan new (Official)',
		channel: 'Eyob Mekonnen',
		language: 'amharic',
		tags: ['eyob mekonnen', 'amharic', 'music']
	},
	{
		videoId: 'NyNY-dwncB8',
		title: 'Tsedenia Gebremarkos - Tsedeniya G/Markos - Mech Gebagn | መች ገባኝ -  ',
		channel: 'Tsedenia Gebremarkos',
		language: 'amharic',
		tags: ['tsedenia gebremarkos', 'amharic', 'music']
	},
	{
		videoId: '1GGV38L-pHE',
		title: 'Dagi Dagne - Awtar Tv - Dagne Walle - Aba Siber - ዳኘ ዋለ - ',
		channel: 'Dagi Dagne',
		language: 'amharic',
		tags: ['dagi dagne', 'amharic', 'music']
	},
	{
		videoId: 'LO1KpHNL5WQ',
		title: 'Tamrat Desta - Enechawet  Tamrat Desta',
		channel: 'Tamrat Desta',
		language: 'amharic',
		tags: ['tamrat desta', 'amharic', 'music']
	},
	{
		videoId: '4BN7XzhQpDY',
		title: 'Bisrat Surafel - Bisrat Surafel - Man | ማን - New Ethiopian Mus',
		channel: 'Bisrat Surafel',
		language: 'amharic',
		tags: ['bisrat surafel', 'amharic', 'music']
	},
	{
		videoId: 'pxVI9Z2KEWM',
		title: 'Dereje Dubale - Derege Dubale, Ged Yelem lebe yichilal',
		channel: 'Dereje Dubale',
		language: 'amharic',
		tags: ['dereje dubale', 'amharic', 'music']
	},
	{
		videoId: 'xwuN5BlAef0',
		title: 'Alex Olympia - ALEX OLYMPIA - METECHALEHU',
		channel: 'Alex Olympia',
		language: 'amharic',
		tags: ['alex olympia', 'amharic', 'music']
	},
	{
		videoId: 'zoGbEFokYOY',
		title: 'Fitsum Teshale - Desalegne Teshale - Ft.Jalud Awel - Yene - ደሳ',
		channel: 'Fitsum Teshale',
		language: 'amharic',
		tags: ['fitsum teshale', 'amharic', 'music']
	},
	{
		videoId: '9PXUpv7f-C4',
		title: 'Haimanot Girma - Haimanot Girma - Kezira',
		channel: 'Haimanot Girma',
		language: 'amharic',
		tags: ['haimanot girma', 'amharic', 'music']
	},
	{
		videoId: 'Biu9nHSwpiI',
		title: 'Hamelmal Abate - Hamelmal Abate - Awdamet "Enkuan Aderesachu" ',
		channel: 'Hamelmal Abate',
		language: 'amharic',
		tags: ['hamelmal abate', 'amharic', 'music']
	},
	{
		videoId: 'uVIghBLJFY8',
		title: 'Helen Berhe - Helen Berhe - Yebereta (የበረታ) | New Ethiopian',
		channel: 'Helen Berhe',
		language: 'amharic',
		tags: ['helen berhe', 'amharic', 'music']
	},
	{
		videoId: 'xPwlVss7yN8',
		title: 'Lij Michael - Lij Michael - የሺ | Yeshi | Ethiopian New Musi',
		channel: 'Lij Michael',
		language: 'amharic',
		tags: ['lij michael', 'amharic', 'music']
	},
	{
		videoId: 'VpraLnMvgMw',
		title: 'Tsehaye Yohannes - Tsehaye Yohannes - Betesfa - ፀሐዬ ዮሃንስ - በተስፋ ',
		channel: 'Tsehaye Yohannes',
		language: 'amharic',
		tags: ['tsehaye yohannes', 'amharic', 'music']
	},
	{
		videoId: 'K6CTf-OluwA',
		title: 'Tibebu Workiye - Tibebu Workeye - Bebagne Ahun Gena',
		channel: 'Tibebu Workiye',
		language: 'amharic',
		tags: ['tibebu workiye', 'amharic', 'music']
	},
	{
		videoId: '4ltz7XAnlbs',
		title: 'Merkeb Bonitua - Teddy Yo. Ft Merkeb Bonitua ቴዲ ዮ ft መርከብ ቦኒቷ ',
		channel: 'Merkeb Bonitua',
		language: 'tigrinya',
		tags: ['merkeb bonitua', 'tigrinya', 'music']
	},
	{
		videoId: 'WV3f7M-6dNA',
		title: 'Solomon Haile - Solomon Haile : Bealti Mado [New! Tigrigna Mu',
		channel: 'Solomon Haile',
		language: 'tigrinya',
		tags: ['solomon haile', 'tigrinya', 'music']
	},
	{
		videoId: '18pNqmYpCk0',
		title: 'Zemen Alemseged - Zemen Alemseged ( ዘመን ኣለምሰገድ ) - በቲ ደመና (beti',
		channel: 'Zemen Alemseged',
		language: 'tigrinya',
		tags: ['zemen alemseged', 'tigrinya', 'music']
	},
	{
		videoId: 'MqVT5GdW6hQ',
		title: 'Timnit Welday - Timnit Welday - Wenani (Official Video) | Eth',
		channel: 'Timnit Welday',
		language: 'tigrinya',
		tags: ['timnit welday', 'tigrinya', 'music']
	},
	{
		videoId: 'yA2sdHdXy0o',
		title: 'Amir Dawud - Amir Dawud - Mekele (Official Video) | Ethiop',
		channel: 'Amir Dawud',
		language: 'tigrinya',
		tags: ['amir dawud', 'tigrinya', 'music']
	},
	{
		videoId: 'nO1Sg2Vlgys',
		title: 'Dawit Alemayehu - Dawit Alemayehu | Aykewnn | ዳዊት አለማየሁ-ኦራ| አይከ',
		channel: 'Dawit Alemayehu',
		language: 'tigrinya',
		tags: ['dawit alemayehu', 'tigrinya', 'music']
	},
	{
		videoId: 'H-fQKUU0qME',
		title: 'Nahom Yohannes - Nahom Yohannes   Seb Entay Zeybele   ሰብ እንታይ ',
		channel: 'Nahom Yohannes',
		language: 'tigrinya',
		tags: ['nahom yohannes', 'tigrinya', 'music']
	},
	{
		videoId: 'CGteduEW554',
		title: 'Eden Gebreselassie - Eden Gebreselassie - Aytneknkni | ኣይትነቅንቅኒ - ',
		channel: 'Eden Gebreselassie',
		language: 'tigrinya',
		tags: ['eden gebreselassie', 'tigrinya', 'music']
	},
	{
		videoId: '4wadY4IbRa4',
		title: 'Dawit Nega - Ethiopia: Dawit Nega - Wezamey (ወዛመይ) NEW! Ti',
		channel: 'Dawit Nega',
		language: 'tigrinya',
		tags: ['dawit nega', 'tigrinya', 'music']
	},
	{
		videoId: '8AVG1A4n8VU',
		title: 'Ephrem Amare - Ephrem Amare - \'Sey (Official Video) | \'ሰይ - ',
		channel: 'Ephrem Amare',
		language: 'tigrinya',
		tags: ['ephrem amare', 'tigrinya', 'music']
	},
	{
		videoId: '-Yjr7CeJVHY',
		title: 'Abraham Gebremedhin - Abraham_Gebremedhin__gorzo__ኣብርሃም_ገ/መድህን__ጎርዞ',
		channel: 'Abraham Gebremedhin',
		language: 'tigrinya',
		tags: ['abraham gebremedhin', 'tigrinya', 'music']
	},
	{
		videoId: '72HWdjEDxpA',
		title: 'Kiros Alemayehu - Kiros Alemayehu MeQenaye',
		channel: 'Kiros Alemayehu',
		language: 'tigrinya',
		tags: ['kiros alemayehu', 'tigrinya', 'music']
	},
	{
		videoId: 'oK9CyU4A0ko',
		title: 'Rahel Haile - Rahel Haile - HANENEN | ሃነነን - ራሄል ሃይለ - New ',
		channel: 'Rahel Haile',
		language: 'tigrinya',
		tags: ['rahel haile', 'tigrinya', 'music']
	},
	{
		videoId: 'nV-SDXGntHo',
		title: 'Mesfin Berhanu - Mesfin Berhanu - Tezez | ተዘዝ - New Ethiopian ',
		channel: 'Mesfin Berhanu',
		language: 'tigrinya',
		tags: ['mesfin berhanu', 'tigrinya', 'music']
	},
	{
		videoId: 'N4VJFlhQC90',
		title: 'Shewit Mezgebo - Shewit Mezgebo - New Tigrigna music 2026 -ወላይ',
		channel: 'Shewit Mezgebo',
		language: 'tigrinya',
		tags: ['shewit mezgebo', 'tigrinya', 'music']
	},
	{
		videoId: 'HOADb_H4buk',
		title: 'Neguse Abadi - Nguse Abadi (Maeger) ንጉሰ ኣባዲ (ማእገር) New Tigri',
		channel: 'Neguse Abadi',
		language: 'tigrinya',
		tags: ['neguse abadi', 'tigrinya', 'music']
	},
	{
		videoId: '-YlVudyi588',
		title: 'Anbessa Tekle - Gamey Kuhulo by Anbessa /Tigray',
		channel: 'Anbessa Tekle',
		language: 'tigrinya',
		tags: ['anbessa tekle', 'tigrinya', 'music']
	},
	{
		videoId: 'KSxFJy3xX1Q',
		title: 'Hermon Baraki - New Eritrean Music 2026 Live Music - Hermon B',
		channel: 'Hermon Baraki',
		language: 'tigrinya',
		tags: ['hermon baraki', 'tigrinya', 'music']
	},
	{
		videoId: 'BzAnS851RcA',
		title: 'Alula Mampa - Natu ft. Alula Mampa  - Knegra - official vid',
		channel: 'Alula Mampa',
		language: 'tigrinya',
		tags: ['alula mampa', 'tigrinya', 'music']
	},
	{
		videoId: 'pXrpnJIXE8U',
		title: 'Freselam Mussie - Freselam Mussie “ ሕራይ በልኒ ‘‘ Hiray belni erit',
		channel: 'Freselam Mussie',
		language: 'tigrinya',
		tags: ['freselam mussie', 'tigrinya', 'music']
	},
	{
		videoId: 'Ae_z03fZze4',
		title: 'Estifanos Abraham Zemach - Estifanos Abraham Zemach - Kndey Mo Kbleki (O',
		channel: 'Estifanos Abraham Zemach',
		language: 'tigrinya',
		tags: ['estifanos abraham zemach', 'tigrinya', 'music']
	},
	{
		videoId: 'NTGAqp1UaXI',
		title: 'Amanuel Yemane - ela tv - Amanuel Yemane - Amanay | ኣማናይ -  Ti',
		channel: 'Amanuel Yemane',
		language: 'tigrinya',
		tags: ['amanuel yemane', 'tigrinya', 'music']
	},
	{
		videoId: 'W-TnSBgYsqE',
		title: 'Robel Michael - Robel Michael - Mizer - New Eritrean Music 20',
		channel: 'Robel Michael',
		language: 'tigrinya',
		tags: ['robel michael', 'tigrinya', 'music']
	},
	{
		videoId: 'Y12TIn7jaDM',
		title: 'Solomon Bayre - ሰሎሙን ባይረ (ወዲ ባይረ) Solomon Bayre - Terekiba ||',
		channel: 'Solomon Bayre',
		language: 'tigrinya',
		tags: ['solomon bayre', 'tigrinya', 'music']
	},
	{
		videoId: '4NRXx6U8ABQ',
		title: 'The Weeknd - The Weeknd - Blinding Lights (Official Video)',
		channel: 'The Weeknd',
		language: 'english',
		tags: ['the weeknd', 'english', 'music']
	},
	{
		videoId: '2Vv-BfVoq4g',
		title: 'Ed Sheeran - Ed Sheeran - Perfect (Official Music Video)',
		channel: 'Ed Sheeran',
		language: 'english',
		tags: ['ed sheeran', 'english', 'music']
	},
	{
		videoId: 'mw3kSNIxjqo',
		title: 'Taylor Swift - Taylor Swift - Patient Zero (Official Music V',
		channel: 'Taylor Swift',
		language: 'english',
		tags: ['taylor swift', 'english', 'music']
	},
	{
		videoId: 'lY5V4hSLWY8',
		title: 'Bruno Mars - Bruno Mars - Risk It All [Official Music Vide',
		channel: 'Bruno Mars',
		language: 'english',
		tags: ['bruno mars', 'english', 'music']
	},
	{
		videoId: 'hLQl3WQQoQ0',
		title: 'Adele - Adele - Someone Like You (Official Music Vide',
		channel: 'Adele',
		language: 'english',
		tags: ['adele', 'english', 'music']
	},
	{
		videoId: 'k2qgadSvNyU',
		title: 'Dua Lipa - Dua Lipa - New Rules (Official Music Video)',
		channel: 'Dua Lipa',
		language: 'english',
		tags: ['dua lipa', 'english', 'music']
	},
	{
		videoId: 'wXhTHyIgQ_U',
		title: 'Post Malone - Post Malone - Circles',
		channel: 'Post Malone',
		language: 'english',
		tags: ['post malone', 'english', 'music']
	},
	{
		videoId: 'RB-RcX5DS5A',
		title: 'Coldplay - Coldplay - The Scientist (Official 4K Video)',
		channel: 'Coldplay',
		language: 'english',
		tags: ['coldplay', 'english', 'music']
	},
	{
		videoId: 'fJ9rUzIMcZQ',
		title: 'Queen - Queen – Bohemian Rhapsody (Official Video Rem',
		channel: 'Queen',
		language: 'english',
		tags: ['queen', 'english', 'music']
	},
	{
		videoId: 'oRdxUFDoQe0',
		title: 'Michael Jackson - Michael Jackson - Beat It (Official 4K Video)',
		channel: 'Michael Jackson',
		language: 'english',
		tags: ['michael jackson', 'english', 'music']
	},
	{
		videoId: 'CvBfHwUxHIk',
		title: 'Rihanna - Rihanna - Umbrella (Orange Version) (Official',
		channel: 'Rihanna',
		language: 'english',
		tags: ['rihanna', 'english', 'music']
	},
	{
		videoId: 'nCkpzqqog4k',
		title: 'Sam Smith - Sam Smith - I\'m Not The Only One (Official Mu',
		channel: 'Sam Smith',
		language: 'english',
		tags: ['sam smith', 'english', 'music']
	},
	{
		videoId: 'uuwfgXD8qV8',
		title: 'Katy Perry - Katy Perry - Part Of Me (Official)',
		channel: 'Katy Perry',
		language: 'english',
		tags: ['katy perry', 'english', 'music']
	},
	{
		videoId: '09R8_2nJtjg',
		title: 'Maroon 5 - Maroon 5 - Sugar (Official Music Video)',
		channel: 'Maroon 5',
		language: 'english',
		tags: ['maroon 5', 'english', 'music']
	},
	{
		videoId: '7wtfhZwyrcc',
		title: 'Imagine Dragons - Imagine Dragons - Believer (Official Music Vi',
		channel: 'Imagine Dragons',
		language: 'english',
		tags: ['imagine dragons', 'english', 'music']
	},
	{
		videoId: 'VbfpW0pbvaU',
		title: 'Shawn Mendes - Shawn Mendes - Stitches (Official Music Video',
		channel: 'Shawn Mendes',
		language: 'english',
		tags: ['shawn mendes', 'english', 'music']
	},
	{
		videoId: 'nfs8NYg7yQM',
		title: 'Charlie Puth - Charlie Puth - Attention [Official Video]',
		channel: 'Charlie Puth',
		language: 'english',
		tags: ['charlie puth', 'english', 'music']
	},
	{
		videoId: 'M4qX5wzx-wY',
		title: 'Harry Styles - Harry Styles - Coming Up Roses (Official Vide',
		channel: 'Harry Styles',
		language: 'english',
		tags: ['harry styles', 'english', 'music']
	},
	{
		videoId: 'qrO4YZeyl0I',
		title: 'Lady Gaga - Lady Gaga - Bad Romance (Official Music Video',
		channel: 'Lady Gaga',
		language: 'english',
		tags: ['lady gaga', 'english', 'music']
	},
	{
		videoId: 'KWZGAExj-es',
		title: 'Sia - Sia - Elastic Heart feat. Shia LaBeouf & Madd',
		channel: 'Sia',
		language: 'english',
		tags: ['sia', 'english', 'music']
	},
	{
		videoId: '60ItHLz5WEA',
		title: 'Alan Walker - Alan Walker - Faded',
		channel: 'Alan Walker',
		language: 'english',
		tags: ['alan walker', 'english', 'music']
	},
	{
		videoId: 'IcrbM1l_BoI',
		title: 'Avicii - Avicii - Wake Me Up (Official Video)',
		channel: 'Avicii',
		language: 'english',
		tags: ['avicii', 'english', 'music']
	},
	{
		videoId: 'YVkUvmDQ3HY',
		title: 'Eminem - Eminem - Without Me (Official Music Video)',
		channel: 'Eminem',
		language: 'english',
		tags: ['eminem', 'english', 'music']
	},
	{
		videoId: 'H58vbez_m4E',
		title: 'Kendrick Lamar - Kendrick Lamar - Not Like Us',
		channel: 'Kendrick Lamar',
		language: 'english',
		tags: ['kendrick lamar', 'english', 'music']
	},
	{
		videoId: 'K0HSD_i2DvA',
		title: 'Daft Punk - Daft Punk - Around The World (Official Music ',
		channel: 'Daft Punk',
		language: 'english',
		tags: ['daft punk', 'english', 'music']
	},
	{
		videoId: 'hT_nvWreIhg',
		title: 'OneRepublic - OneRepublic - Counting Stars',
		channel: 'OneRepublic',
		language: 'english',
		tags: ['onerepublic', 'english', 'music']
	},
	{
		videoId: 'fRh_vgS2dFE',
		title: 'Justin Bieber - Sorry',
		channel: 'Justin Bieber',
		language: 'english',
		tags: ['justin bieber', 'sorry', 'pop', 'english']
	},
	{
		videoId: 'gl1aHhXnN1k',
		title: 'Ariana Grande - thank u, next',
		channel: 'Ariana Grande',
		language: 'english',
		tags: ['ariana grande', 'pop', 'english']
	},
	{
		videoId: '4m1EFMoRFvY',
		title: 'Beyonce - Single Ladies',
		channel: 'Beyonce',
		language: 'english',
		tags: ['beyonce', 'pop', 'english']
	},
	{
		videoId: 'uxpDa-c-4Mc',
		title: 'Drake - Hotline Bling',
		channel: 'Drake',
		language: 'english',
		tags: ['drake', 'hip hop', 'english']
	},
	{
		videoId: 'HUHC9tYz8ik',
		title: 'Billie Eilish - bury a friend',
		channel: 'Billie Eilish',
		language: 'english',
		tags: ['billie eilish', 'alt pop', 'english']
	}
];

/** Extracts and normalizes the primary singer/artist name from track metadata. */
export function extractSinger(track?: { channel?: string; title?: string } | null): string {
	if (!track) return '';
	const ch = (track.channel ?? '').toLowerCase().trim();
	const ti = (track.title ?? '').toLowerCase().trim();
	const combined = `${ch} ${ti}`;

	const KNOWN_SINGERS = [
		'abdu kiar',
		'abinet agonafir',
		'abraham gebremedhin',
		'adele',
		'alan walker',
		'alemayehu eshete',
		'alex olympia',
		'alula mampa',
		'amanuel yemane',
		'amir dawud',
		'anbessa tekle',
		'ariana grande',
		'aster aweke',
		'avicii',
		'betty g',
		'beyonce',
		'billie eilish',
		'bisrat surafel',
		'bizunesh bekele',
		'bruno mars',
		'charlie puth',
		'coldplay',
		'daft punk',
		'dagi dagne',
		'dawit alemayehu',
		'dawit nega',
		'dawit tsige',
		'dereje dubale',
		'drake',
		'dua lipa',
		'ed sheeran',
		'eden gebreselassie',
		'eminem',
		'ephrem amare',
		'ephrem tamiru',
		'estifanos abraham zemach',
		'eyob mekonnen',
		'fitsum teshale',
		'freselam mussie',
		'gigi shibabaw',
		'gossaye tesfaye',
		'haimanot girma',
		'hamelmal abate',
		'harry styles',
		'helen berhe',
		'hermon baraki',
		'hirut bekele',
		'imagine dragons',
		'justin bieber',
		'katy perry',
		'kendrick lamar',
		'kiros alemayehu',
		'lady gaga',
		'lij michael',
		'mahmoud ahmed',
		'maroon 5',
		'merkeb bonitua',
		'mesfin berhanu',
		'michael belayneh',
		'michael jackson',
		'muluken melesse',
		'nahom yohannes',
		'neguse abadi',
		'onerepublic',
		'post malone',
		'queen',
		'rahel haile',
		'rihanna',
		'robel michael',
		'rophnan',
		'sam smith',
		'shawn mendes',
		'shewit mezgebo',
		'sia',
		'solomon bayre',
		'solomon haile',
		'tamrat desta',
		'taylor swift',
		'teddy afro',
		'the weeknd',
		'tibebu workiye',
		'tilahun gessesse',
		'timnit welday',
		'tsedenia gebremarkos',
		'tsegaye eshetu',
		'tsehaye yohannes',
		'zemen alemseged'
	];

	for (const s of KNOWN_SINGERS) {
		if (combined.includes(s)) {
			if (s.includes('abraham') || s.includes('abreham')) return 'abraham gebremedhin';
			if (s.includes('eden')) return 'eden gebreselassie';
			if (s.includes('daft punk')) return 'the weeknd';
			if (s.includes('bruno mars')) return 'bruno mars';
			return s;
		}
	}

	return ch || ti.split(/[-–]/)[0]?.trim() || '';
}

export function getSimilarCuratedTracks(
	currentTrack?: { videoId?: string | null; title?: string; channel?: string; genre?: string } | null,
	playedVideoIds: Set<string> = new Set(),
	count = 4
): Array<{ videoId: string; title: string; channel: string; label: string; language: MusicLanguage }> {
	const currentVid = currentTrack?.videoId ?? '';
	const targetLang = detectMusicLanguage(currentTrack);
	const currentSinger = extractSinger(currentTrack);

	// STRICT LANGUAGE FILTER: Only pick songs of the same language
	const languageCatalog = CURATED_CATALOG.filter((item) => item.language === targetLang);

	const scored = languageCatalog.map((item) => {
		if (item.videoId === currentVid || isBannedMusic(item.videoId, item.title)) {
			return { item, score: -1 };
		}

		const itemSinger = extractSinger(item);
		const isSameSinger = !!currentSinger && !!itemSinger && itemSinger === currentSinger;

		// STRICT REQUIREMENT: Never suggest the same singer in a row (ensure a varied mix of singers)!
		if (isSameSinger) {
			return { item, score: -1 };
		}

		let score = 30; // Base score for matching language

		// Deprioritize tracks already played in this room session
		if (playedVideoIds.has(item.videoId)) {
			score -= 50;
		}

		return { item, score };
	});

	// Sort highest score first, with jitter for natural variety
	scored.sort((a, b) => b.score - a.score || Math.random() - 0.5);

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

	// If all other singers have already been played, cycle back through candidates, still avoiding currentVid and currentSinger
	if (results.length === 0) {
		const differentSingers = languageCatalog.filter(
			(c) => c.videoId !== currentVid && !isBannedMusic(c.videoId, c.title) && extractSinger(c) !== currentSinger
		);
		const pool = differentSingers.length > 0 ? differentSingers : languageCatalog.filter((c) => c.videoId !== currentVid);
		return pool.slice(0, count).map((item) => ({
			videoId: item.videoId,
			title: `${item.channel} - ${item.title}`,
			channel: item.channel,
			label: item.title.slice(0, 20),
			language: item.language
		}));
	}

	return results;
}

export function getSuggestedTracks(
	currentTrack?: { videoId?: string | null; title?: string; channel?: string; genre?: string } | null,
	playedVideoIds: Set<string> = new Set(),
	count = 3
): Array<{ label: string; title: string; channel: string; videoId: string; language: MusicLanguage }> {
	return getSimilarCuratedTracks(currentTrack, playedVideoIds, count);
}

/**
 * Resolves a related YouTube track when the room queue has finished playing.
 * - Strictly music only (No news, talk shows, sermons, podcasts, or cultural folk).
 * - Rotates through a rich roster of different singers (never repeats the same singer in a row).
 * - If last track was Amharic -> autoplays Amharic modern music!
 * - If last track was Tigrinya -> autoplays Ethiopian Tigrinya hit music!
 * - If last track was English -> autoplays English vocal hit music!
 */
export async function getRelatedYouTubeTrack(
	currentTrack?: { videoId?: string | null; title?: string; channel?: string; genre?: string } | null,
	playedVideoIds: Set<string> = new Set()
): Promise<{ videoId: string; title: string; channel: string; language?: MusicLanguage }> {
	const currentVid = currentTrack?.videoId;
	const targetLang = detectMusicLanguage(currentTrack);
	const currentSinger = extractSinger(currentTrack);

	// 1. Similarity-matched curated music track from a DIFFERENT singer
	const suggestions = getSimilarCuratedTracks(currentTrack, playedVideoIds, 6);
	if (suggestions.length > 0) {
		return suggestions[0];
	}

	// 2. Language-matched catalog pool ensuring singer diversity
	const catalog = CURATED_CATALOG.filter((c) => c.language === targetLang);
	const picked =
		catalog.find((c) => c.videoId !== currentVid && extractSinger(c) !== currentSinger && !playedVideoIds.has(c.videoId)) ||
		catalog.find((c) => c.videoId !== currentVid && extractSinger(c) !== currentSinger) ||
		catalog.find((c) => c.videoId !== currentVid && !playedVideoIds.has(c.videoId)) ||
		catalog.find((c) => c.videoId !== currentVid) ||
		catalog[0];

	return {
		videoId: picked.videoId,
		title: picked.title,
		channel: picked.channel,
		language: targetLang
	};
}
