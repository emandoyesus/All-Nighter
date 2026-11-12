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

let activeSessionLanguage: MusicLanguage = 'amharic';

export function getActiveSessionLanguage(): MusicLanguage {
	return activeSessionLanguage;
}

export function setActiveSessionLanguage(lang: MusicLanguage): void {
	activeSessionLanguage = lang;
}

/**
 * Detects whether a track is Amharic, Ethiopian Tigrinya, or English / International music.
 */
export function detectMusicLanguage(
	track?: { videoId?: string | null; title?: string; channel?: string; genre?: string; language?: MusicLanguage } | null
): MusicLanguage {
	if (!track) return activeSessionLanguage;
	if (track.language) {
		activeSessionLanguage = track.language;
		return track.language;
	}

	// 1. Direct match with curated catalog by video ID
	if (track.videoId) {
		const match = CURATED_CATALOG.find((c) => c.videoId === track.videoId);
		if (match?.language) {
			activeSessionLanguage = match.language;
			return match.language;
		}
	}

	const title = (track.title ?? '').toLowerCase();
	const channel = (track.channel ?? '').toLowerCase();
	const genre = (track.genre ?? '').toLowerCase();
	const combined = `${title} ${channel} ${genre}`;

	// 2. Check Ethiopian Tigrinya indicators
	const isTigrinya =
		/tigrinya|tigrigna|tigrina|tigray|mekelle|asmera|eritrea|eritrean|dawit\s*nega|abraham\s*gebremedhin|abreham\s*g\/medhin|kiros\s*alemayehu|eden\s*gebreselasie|gidey\s*gebremedhin|haftu\s*zeferu|tesfay\s*gomera|teklemariam|yemane\s*barya|aytekaelen|fetiki|merkeb\s*bonitua|solomon\s*haile|zemen\s*alemseged|tmnit\s*welday|timnit\s*welday|mahlet\s*gebrezgiaber|amir\s*dawud|dawit\s*alemayehu|nahom\s*yohannes|ephrem\s*amare|rahel\s*haile|mesfin\s*berhanu|shewit\s*mezgebo|neguse\s*abadi|anbessa\s*tekle|hermon\s*baraki|alula\s*mampa|tesfaye\s*gebre|freselam\s*mussie|estifanos\s*abraham|amanuel\s*yemane|robel\s*michael|solomon\s*bayre/i.test(
			combined
		) || /[\u1250-\u1256\u1318-\u131F]/.test(combined);

	if (isTigrinya) {
		activeSessionLanguage = 'tigrinya';
		return 'tigrinya';
	}

	// 3. Check Amharic / Ethiopian modern pop indicators or Ge'ez script
	const isAmharic =
		/amharic|ethiopia|ethiopian|habesha|habesh|addis|ababa|shewa|gondar|gojjam|wello|oromo|afar|sidama|somali|harar|gurage|wolayta|ephrem\s*tamiru|aster\s*aweke|tamrat\s*desta|tilahun\s*gessesse|tlahoun|aregahegn\s*worash|kuku\s*sebsebe|girma\s*tefera|teddy\s*afro|tewodros\s*kassahun|michael\s*belayneh|belayneh|rophnan|dawit\s*tsige|neway\s*damtie|gosaye|zeritu|eyob\s*mekonnen|hope\s*music|minew\s*shewa|sewasew|nahom|mahmoud\s*ahmed|muluken\s*melesse|abinet\s*agonafir|abdu\s*kiar|abdu\s*kiyar|gigi\s*shibabaw|bizunesh\s*bekele|alemayehu\s*eshete|hirut\s*bekele|betty\s*g|tsegaye\s*eshetu|tsedenia\s*gebremarkos|dagi\s*dagne|dag\s*daniel|bisrat\s*surafel|dereje\s*dubale|alex\s*olympia|alex\s*olompia|fitsum\s*t|haimanot\s*girma|hamelmal\s*abate|helen\s*berhe|lij\s*michael|tsehaye\s*yohannes|tibebu\s*workiye|madingo\s*afework|madingo|veronica\s*adane|veronica|awtar|awtar\s*music|awtar\s*tv|ebs|ebs\s*tv|liham|liham\s*melody|gize\s*network|sami\s*dan|kassmasse|kasmasse|jano|jano\s*band|dan\s*admasu|admas|shewandagn\s*hailu|fikreaddis\s*nekatibeb|fikreaddis|hailu\s*mergia|mulatu\s*astatke|mulatu|selamawit\s*yohannes|yohana|mehari\s*brothers|tariku\s*gankisi|dishtagina|balageru|zefen|tizita|bati|ambassel|anchihoye|alhedim|wubet|yene|yagere|eskista|arada/i.test(
			combined
		) || /[\u1200-\u137F]/.test(combined);

	if (isAmharic) {
		activeSessionLanguage = 'amharic';
		return 'amharic';
	}

	// 4. Check explicit English / International indicators
	const isEnglish =
		/coldplay|adele|weeknd|ed\s*sheeran|taylor\s*swift|billie\s*eilish|post\s*malone|drake|travis\s*scott|kendrick|justin\s*bieber|rihanna|beyonce|bruno\s*mars|maroon\s*5|dua\s*lipa|harry\s*styles|ariana\s*grande|eminem|queen|michael\s*jackson|imagine\s*dragons|arctic\s*monkeys|linkin\s*park|chainsmokers|charlie\s*puth|shawn\s*mendes|olivia\s*rodrigo|sam\s*smith|sia|lana\s*del\s*rey|katy\s*perry|lady\s*gaga|twenty\s*one\s*pilots|marshmello|avicii|alan\s*walker|calvin\s*harris|david\s*guetta|kygo|martin\s*garrix|tiesto|zedd|afrobeats|wizkid|burna\s*boy|davido|rema|asake|ayra\s*starr|tems|omah\s*lay|fireboy|the\s*neighbourhood|tom\s*odell|rag\'n\'bone|xxxtentacion|billie|vevo|billboard|pop\s*hits|acoustic/i.test(
			combined
		);

	if (isEnglish) {
		activeSessionLanguage = 'english';
		return 'english';
	}

	// 5. Fallback: preserve current session language so Amharic music never flips to English!
	return activeSessionLanguage;
}

export type CuratedTrack = {
	videoId: string;
	title: string;
	channel: string;
	language: MusicLanguage;
	tags: string[];
};

export const CURATED_CATALOG: CuratedTrack[] = [
	// AMHARIC (Top 5 tracks per artist)
	// ============================================================
	{
		videoId: 'xE-9kJOPbxE',
		title: 'Teddy Afro - Alamin [Official Video]',
		channel: 'Teddy Afro',
		language: 'amharic',
		tags: ['teddy afro', 'amharic', 'music']
	},
	{
		videoId: 'UlqLeuVHpEU',
		title: 'Teddy Afro - ሺ ቢባል (ወደ 90ዎቹ) - Shih Bibal (Back to 90s) | Track 9 (Official Lyrics Video)',
		channel: 'Teddy Afro',
		language: 'amharic',
		tags: ['teddy afro', 'amharic', 'music']
	},
	{
		videoId: 'pRHWe6Lz2mY',
		title: 'Teddy Afro - ታየኝ - Tayegn | Track 10 (Official Lyrics Video)',
		channel: 'Teddy Afro',
		language: 'amharic',
		tags: ['teddy afro', 'amharic', 'music']
	},
	{
		videoId: '-qUZFnbAoT0',
		title: 'Teddy Afro - ETORIKA ALBUM NONSTOP| ETO-A (Official Visualizer)',
		channel: 'Teddy Afro',
		language: 'amharic',
		tags: ['teddy afro', 'amharic', 'music']
	},
	{
		videoId: 'mpngSRVbeIs',
		title: 'Teddy Afro - ETORIKA ALBUM NONSTOP | ETO - B (Official Visualizer)',
		channel: 'Teddy Afro',
		language: 'amharic',
		tags: ['teddy afro', 'amharic', 'music']
	},
	{
		videoId: '581JQIgckzo',
		title: 'Aster Aweke - Bale Gariw | አስቴር አወቀ - ባለ ጋሪው',
		channel: 'Aster Aweke',
		language: 'amharic',
		tags: ['aster aweke', 'amharic', 'music']
	},
	{
		videoId: '6OCBxSC0r4g',
		title: 'Aster Aweke - 01 Aster Aweke Gela Gela',
		channel: 'Aster Aweke',
		language: 'amharic',
		tags: ['aster aweke', 'amharic', 'music']
	},
	{
		videoId: 'o04VXsniPx0',
		title: 'Aster Aweke - 02 Aster Aweke Bayne Mulu',
		channel: 'Aster Aweke',
		language: 'amharic',
		tags: ['aster aweke', 'amharic', 'music']
	},
	{
		videoId: 'Uil1RJN1QTQ',
		title: 'Aster Aweke - አስቴር አወቀ - የኔ ወዳጅ | Aster Aweke -  Yene Wedaj  [Official Visualizer 2026]',
		channel: 'Aster Aweke',
		language: 'amharic',
		tags: ['aster aweke', 'amharic', 'music']
	},
	{
		videoId: 'UlqLeuVHpEU',
		title: 'Aster Aweke - TEDDY AFRO  - ሺ ቢባል (ወደ 90ዎቹ) - Shih Bibal (Back to 90s) | Track 9 (Official Lyrics Video)',
		channel: 'Aster Aweke',
		language: 'amharic',
		tags: ['aster aweke', 'amharic', 'music']
	},
	{
		videoId: 'UD0fA2WJdbU',
		title: 'Tilahun Gessesse - Kome Limerkish | ቆሜ ልመርቅሽ',
		channel: 'Tilahun Gessesse',
		language: 'amharic',
		tags: ['tilahun gessesse', 'amharic', 'music']
	},
	{
		videoId: 'ZIOYTYT1uBA',
		title: 'Tilahun Gessesse - Hit Track',
		channel: 'Tilahun Gessesse',
		language: 'amharic',
		tags: ['tilahun gessesse', 'amharic', 'music']
	},
	{
		videoId: 'DiFxBCZq4hc',
		title: 'Tilahun Gessesse - ጥላሁን ገሠሠ ምርጥ 10 የፍቅር ዘፈኖች | Tilahin Gessesse Top 10 Love songs',
		channel: 'Tilahun Gessesse',
		language: 'amharic',
		tags: ['tilahun gessesse', 'amharic', 'music']
	},
	{
		videoId: 'GWX1RskfUwA',
		title: 'Tilahun Gessesse - Xasan Diiriye Faarax Iyo Hibo Nuura Maxamed 🔥Iyo Heesta DHALANTEED',
		channel: 'Tilahun Gessesse',
		language: 'amharic',
		tags: ['tilahun gessesse', 'amharic', 'music']
	},
	{
		videoId: 'UsA86uT6QBk',
		title: 'Tilahun Gessesse - Wubetin Ayenat',
		channel: 'Tilahun Gessesse',
		language: 'amharic',
		tags: ['tilahun gessesse', 'amharic', 'music']
	},
	{
		videoId: 'exHYkiFkbHU',
		title: 'Mahmoud Ahmed - Yeshi Hargetu',
		channel: 'Mahmoud Ahmed',
		language: 'amharic',
		tags: ['mahmoud ahmed', 'amharic', 'music']
	},
	{
		videoId: 't9nTYGI-NXk',
		title: 'Mahmoud Ahmed - Best of Mahmoud Ahmed Collection',
		channel: 'Mahmoud Ahmed',
		language: 'amharic',
		tags: ['mahmoud ahmed', 'amharic', 'music']
	},
	{
		videoId: '0HeOkd-HAsY',
		title: 'Mahmoud Ahmed - yeshi haregitu & Endegena',
		channel: 'Mahmoud Ahmed',
		language: 'amharic',
		tags: ['mahmoud ahmed', 'amharic', 'music']
	},
	{
		videoId: '-H2naX9Gec4',
		title: 'Mahmoud Ahmed - Muziqa Deg Nesh',
		channel: 'Mahmoud Ahmed',
		language: 'amharic',
		tags: ['mahmoud ahmed', 'amharic', 'music']
	},
	{
		videoId: '6ki_gf6BQ88',
		title: 'Mahmoud Ahmed - Mehamud Ahmed_linurbet|መሀሙድ አህመድ_ልኑርበት_New ethiopian music lyrics 2023',
		channel: 'Mahmoud Ahmed',
		language: 'amharic',
		tags: ['mahmoud ahmed', 'amharic', 'music']
	},
	{
		videoId: 'nDGUOFzxMl0',
		title: 'Muluken Melesse - Baynish Lilefibet (ባይንሽ ልለፍ',
		channel: 'Muluken Melesse',
		language: 'amharic',
		tags: ['muluken melesse', 'amharic', 'music']
	},
	{
		videoId: '_9j5c7KETXQ',
		title: 'Muluken Melesse minew kerefede Lyrics  ሙሉቀን መለሰ ምንው ከረፈደ ግጥም',
		channel: 'Muluken Melesse',
		language: 'amharic',
		tags: ['muluken melesse', 'amharic', 'music']
	},
	{
		videoId: 'c9Invp75HwU',
		title: 'Muluken Melesse - ❤ሙሉቀን መለሰ – ምርጥ ዘፈኖች ስብስብ | Muluken Melesse Old Amharic Music | Old Ethiopian Nonstop Mix',
		channel: 'Muluken Melesse',
		language: 'amharic',
		tags: ['muluken melesse', 'amharic', 'music']
	},
	{
		videoId: 'yHVj4k4moAc',
		title: 'Muluken Melesse - ሙሉቀን መለሰ - ምርጥ ዘፈኖች ስብስብ | Muluken Melese Old Songs',
		channel: 'Muluken Melesse',
		language: 'amharic',
		tags: ['muluken melesse', 'amharic', 'music']
	},
	{
		videoId: 'JmaerpzFYww',
		title: 'Muluken Melesse - Minew Kerefede',
		channel: 'Muluken Melesse',
		language: 'amharic',
		tags: ['muluken melesse', 'amharic', 'music']
	},
	{
		videoId: 'UjidhLKXA_g',
		title: 'Abinet Agonafir - አብነት አጎናፍር | የእውነት መንገድ | Yew',
		channel: 'Abinet Agonafir',
		language: 'amharic',
		tags: ['abinet agonafir', 'amharic', 'music']
	},
	{
		videoId: 'MFSdbrCA0Fc',
		title: 'Abinet Agonafir - አብነት አጎናፍር -አስታራቂ | Abinet Agonafir- Astaraki',
		channel: 'Abinet Agonafir',
		language: 'amharic',
		tags: ['abinet agonafir', 'amharic', 'music']
	},
	{
		videoId: 'SQJpB0HD8nw',
		title: 'Abinet Agonafir - አብነት አጎናፍር- ስሚኝ | Abinet Agonafir- Semign (Official Lyrics Video)',
		channel: 'Abinet Agonafir',
		language: 'amharic',
		tags: ['abinet agonafir', 'amharic', 'music']
	},
	{
		videoId: 'Mgwp-GIFmiw',
		title: 'Abinet Agonafir - Ethiopian Music Abinet Agonafir simign/ listen',
		channel: 'Abinet Agonafir',
		language: 'amharic',
		tags: ['abinet agonafir', 'amharic', 'music']
	},
	{
		videoId: 'y2Z84i_pnU0',
		title: 'Abinet Agonafir - አብነት አጎናፍር- ጩህ ጩህ ይለኛል | Abinet Agonafir- Chuh Chuh Yilegnal (Official Lyrics Video)',
		channel: 'Abinet Agonafir',
		language: 'amharic',
		tags: ['abinet agonafir', 'amharic', 'music']
	},
	{
		videoId: '3saR6DZGfNU',
		title: 'Dawit Tsige - እትቱ | Etitu (Official Concert M',
		channel: 'Dawit Tsige',
		language: 'amharic',
		tags: ['dawit tsige', 'amharic', 'music']
	},
	{
		videoId: 'asZszsycNNs',
		title: 'Dawit Tsige - Hailu Amerga & Dawit Tsige - Keteraraw mado ( Concert Video ) ኃይሉ አመርጋ ና ዳዊት ፅጌ   ከተራራው ማዶ',
		channel: 'Dawit Tsige',
		language: 'amharic',
		tags: ['dawit tsige', 'amharic', 'music']
	},
	{
		videoId: 'hhs_ZRQEiJ8',
		title: 'Dawit Tsige - Hit Track',
		channel: 'Dawit Tsige',
		language: 'amharic',
		tags: ['dawit tsige', 'amharic', 'music']
	},
	{
		videoId: 'HLdcgcVQ1gk',
		title: 'Dawit Tsige - Hit Track',
		channel: 'Dawit Tsige',
		language: 'amharic',
		tags: ['dawit tsige', 'amharic', 'music']
	},
	{
		videoId: '93XiEdt8iVA',
		title: 'Dawit Tsige Asechelosh -Lyrics  ዳዊት ፅጌ - አስችሎሽ',
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
		videoId: 'CmNGEcltUYk',
		title: 'Abdu Kiar - Yetal Yetal - Ethiopian music አብዱ ኪያር - የታል የታል',
		channel: 'Abdu Kiar',
		language: 'amharic',
		tags: ['abdu kiar', 'amharic', 'music']
	},
	{
		videoId: 'tMCh3JiodN4',
		title: 'Abdu Kiar - Ethiopian music with lyrics - Abdu Kiar - Ete Emete አብዱ ኪያር - እቴ ሜቴ - ከግጥም ጋር',
		channel: 'Abdu Kiar',
		language: 'amharic',
		tags: ['abdu kiar', 'amharic', 'music']
	},
	{
		videoId: 'NP3MuFWY0vg',
		title: 'Abdu Kiar - yelijenete Lyric video',
		channel: 'Abdu Kiar',
		language: 'amharic',
		tags: ['abdu kiar', 'amharic', 'music']
	},
	{
		videoId: '-KezcyaYpD4',
		title: 'Abdu Kiar - Zoro Zoro Adam',
		channel: 'Abdu Kiar',
		language: 'amharic',
		tags: ['abdu kiar', 'amharic', 'music']
	},
	{
		videoId: 'yKlol9zuE5s',
		title: 'Gossaye Tesfaye - Kurfiyaw | ጎሳዬ ተስፋዬ - ኩርፊያው',
		channel: 'Gossaye Tesfaye',
		language: 'amharic',
		tags: ['gossaye tesfaye', 'amharic', 'music']
	},
	{
		videoId: 'MLOfbX8pNDg',
		title: 'Gossaye Tesfaye - ጎሳዬ ተስፋዬ ሸጋ ልጅ በሀሳቤ ተወዳጅ ሙዚቃ በግጥም//Gosaye tesfaye shega lij behasabe ethiopian music lyrics',
		channel: 'Gossaye Tesfaye',
		language: 'amharic',
		tags: ['gossaye tesfaye', 'amharic', 'music']
	},
	{
		videoId: '5zODWhwba8Y',
		title: 'Gossaye Tesfaye - Sew telamdo || ጎሳዬ ተስፋዬ - ሰው ተላምዶ (lyrics)',
		channel: 'Gossaye Tesfaye',
		language: 'amharic',
		tags: ['gossaye tesfaye', 'amharic', 'music']
	},
	{
		videoId: 'kSS2_hGZnC8',
		title: 'Gossaye Tesfaye - Konjiye',
		channel: 'Gossaye Tesfaye',
		language: 'amharic',
		tags: ['gossaye tesfaye', 'amharic', 'music']
	},
	{
		videoId: 'cqIqyr-gIog',
		title: 'Gossaye Tesfaye - man benegersh (lyrics)',
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
		videoId: 'zvoZbLxkT4I',
		title: 'Gigi Shibabaw - Gigi: Gud Fella',
		channel: 'Gigi Shibabaw',
		language: 'amharic',
		tags: ['gigi shibabaw', 'amharic', 'music']
	},
	{
		videoId: 'NGhQjxuAAIg',
		title: 'Gigi Shibabaw - Mengedegna',
		channel: 'Gigi Shibabaw',
		language: 'amharic',
		tags: ['gigi shibabaw', 'amharic', 'music']
	},
	{
		videoId: 'ouMqW1oIpcI',
		title: 'Gigi Shibabaw - Gigi Emama , (And hager) // እጅጋየሁ ሽባባው (ጂጂ) እማማ ፤ አንድ ሀገር (Ejigayehu Shibabaw)',
		channel: 'Gigi Shibabaw',
		language: 'amharic',
		tags: ['gigi shibabaw', 'amharic', 'music']
	},
	{
		videoId: 'r72Z8w2JisA',
		title: 'Gigi Shibabaw - Gigi Eskemeche // እጅጋየሁ ሽባባው (ጂጂ) እስከመቼ',
		channel: 'Gigi Shibabaw',
		language: 'amharic',
		tags: ['gigi shibabaw', 'amharic', 'music']
	},
	{
		videoId: 'kzXPkoD3Lwg',
		title: 'Ephrem Tamiru - Akale - ኤፍሬም ታምሩ - አካሌ - Ethi',
		channel: 'Ephrem Tamiru',
		language: 'amharic',
		tags: ['ephrem tamiru', 'amharic', 'music']
	},
	{
		videoId: 'eK-oyVCvnAQ',
		title: 'Ephrem Tamiru - ኤፍሬም ታምሩ - ምርጥ ዘፈኖች ስብስብ | Ephrem Tamiru Best Songs Collection #ኤፍሬም_ታምሩ #Ephrem_tamiru #music2025',
		channel: 'Ephrem Tamiru',
		language: 'amharic',
		tags: ['ephrem tamiru', 'amharic', 'music']
	},
	{
		videoId: 'tUg2xJSp6Qs',
		title: 'Ephrem Tamiru Collection vol.1',
		channel: 'Ephrem Tamiru',
		language: 'amharic',
		tags: ['ephrem tamiru', 'amharic', 'music']
	},
	{
		videoId: '8yRY1GnDv8o',
		title: 'Ephrem Tamiru - Metadel New - ኤፍሬም ታምሩ - መታደል ነው - Ethiopian Music',
		channel: 'Ephrem Tamiru',
		language: 'amharic',
		tags: ['ephrem tamiru', 'amharic', 'music']
	},
	{
		videoId: 'Tw6KA_yG3Rc',
		title: 'Ephrem Tamiru - ኤፍሬም ታምሩ 1985 ሙሉ አልበም | Ephrem Tamiru Full Album | Ethiopian Music #Ethiopian Music',
		channel: 'Ephrem Tamiru',
		language: 'amharic',
		tags: ['ephrem tamiru', 'amharic', 'music']
	},
	{
		videoId: 'd8BdXzg9AMQ',
		title: 'Bizunesh Bekele - Timeless Ethiopian Oldies',
		channel: 'Bizunesh Bekele',
		language: 'amharic',
		tags: ['bizunesh bekele', 'amharic', 'music']
	},
	{
		videoId: 'tG0YD68vKtI',
		title: 'Bizunesh Bekele - ሂሩት በቀለ - ስምህን አውሰኝ  New Ethiopian Music 2026  Hirut Bekele  (Renewed)',
		channel: 'Bizunesh Bekele',
		language: 'amharic',
		tags: ['bizunesh bekele', 'amharic', 'music']
	},
	{
		videoId: 'kJAcnNj3cNc',
		title: 'Bizunesh Bekele - _yewedegn aywedegn|ብዙነሽ በቀለ_ ይወደኝ አይወደኝ_New ethiopian music lyrics 2024',
		channel: 'Bizunesh Bekele',
		language: 'amharic',
		tags: ['bizunesh bekele', 'amharic', 'music']
	},
	{
		videoId: '7w4SXx9kV6o',
		title: 'Bizunesh Bekele   አረ እንዴት ነው በሉት  Emotional AI Cover Music 2026  Best Ethiopian Classic Legend',
		channel: 'Bizunesh Bekele',
		language: 'amharic',
		tags: ['bizunesh bekele', 'amharic', 'music']
	},
	{
		videoId: 'fRItBu3XKsI',
		title: 'Bizunesh Bekele - ፍቅርን በልቤ | Fikirin Belibe — Bizunesh Bekele Tribute | LucyWave Cover',
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
		videoId: '6nybsPdN5ek',
		title: 'Alemayehu Eshete - ስቀሽ አታስቂኝ - Sikesh Ataskigne',
		channel: 'Alemayehu Eshete',
		language: 'amharic',
		tags: ['alemayehu eshete', 'amharic', 'music']
	},
	{
		videoId: 'newPahjRwT4',
		title: 'Alemayehu Eshete - Beliye',
		channel: 'Alemayehu Eshete',
		language: 'amharic',
		tags: ['alemayehu eshete', 'amharic', 'music']
	},
	{
		videoId: 'GYlWgPulcjc',
		title: 'Alemayehu Eshete Wodedku Afekerkush/ አለማየሁ እሸቴ ወደድኩ አፈቀርኩሽ',
		channel: 'Alemayehu Eshete',
		language: 'amharic',
		tags: ['alemayehu eshete', 'amharic', 'music']
	},
	{
		videoId: 'ME2waiU9mZE',
		title: 'Alemayehu Eshete - Beliye Beliye (AI Cover) | አለማየሁ እሸቴ - በልዬ በልዬ',
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
		videoId: 'WtswsOdrPao',
		title: 'Hirut Bekele - 🛑🛑Hirut Bekele Old Album 03 | ሂሩት በቀለ 1980 ዓም ሙሉ አልበም',
		channel: 'Hirut Bekele',
		language: 'amharic',
		tags: ['hirut bekele', 'amharic', 'music']
	},
	{
		videoId: 'II3wWAM2U5s',
		title: 'Hirut Bekele - Ethiopian Oldies - Classic',
		channel: 'Hirut Bekele',
		language: 'amharic',
		tags: ['hirut bekele', 'amharic', 'music']
	},
	{
		videoId: 'AYDDFhgs134',
		title: 'Hirut Bekele - ETHIOPIAN MUSIC -HIWOT ENDE SHEKLA – HIRUT BEKELE',
		channel: 'Hirut Bekele',
		language: 'amharic',
		tags: ['hirut bekele', 'amharic', 'music']
	},
	{
		videoId: 'NXjBdQsssj0',
		title: 'Hirut Bekele - ሽታ ሆነህ ቆየኝ: #EthiopianMusic ሂሩት በቀለ እንደገና',
		channel: 'Hirut Bekele',
		language: 'amharic',
		tags: ['hirut bekele', 'amharic', 'music']
	},
	{
		videoId: 'kUknTOgdWgk',
		title: 'Rophnan - SHEGIYE | ሮፍናን - ሸግዬ',
		channel: 'Rophnan',
		language: 'amharic',
		tags: ['rophnan', 'amharic', 'music']
	},
	{
		videoId: 'a6oos465ZU0',
		title: 'Rophnan - DESSE | ሮፍናን - ደሴ',
		channel: 'Rophnan',
		language: 'amharic',
		tags: ['rophnan', 'amharic', 'music']
	},
	{
		videoId: 'xIVv3-WCv4s',
		title: 'Rophnan - HAYA feat. Kismaw & Mahlet Negash | ሮፍናን - ሀያ feat. ኪስማው እና ማሀሌት ነጋሽ',
		channel: 'Rophnan',
		language: 'amharic',
		tags: ['rophnan', 'amharic', 'music']
	},
	{
		videoId: '1Eftvwn5mfc',
		title: 'Rophnan - YESAT ERAT feat. Merewa Choir | ሮፍናን - የእሳት እራት feat. መረዋ ኳየር',
		channel: 'Rophnan',
		language: 'amharic',
		tags: ['rophnan', 'amharic', 'music']
	},
	{
		videoId: '0cFVse_kFz8',
		title: 'Rophnan, Harmonize - YELOMI (Official Audio)',
		channel: 'Rophnan',
		language: 'amharic',
		tags: ['rophnan', 'amharic', 'music']
	},
	{
		videoId: 'o2o6V5YwDrU',
		title: 'Michael Belayneh - የፍቅር ምርጫዬ  _ Yefkr Mirchay',
		channel: 'Michael Belayneh',
		language: 'amharic',
		tags: ['michael belayneh', 'amharic', 'music']
	},
	{
		videoId: 'g58PqHxBSBc',
		title: 'Michael Belayneh - እንዴት - Endet | Track 4  (Official Lyrics Video)',
		channel: 'Michael Belayneh',
		language: 'amharic',
		tags: ['michael belayneh', 'amharic', 'music']
	},
	{
		videoId: 'e1nA4TyD6uY',
		title: 'Michael Belayneh _ Ante Godana Album Nonstop | አንተ ጎዳና ሙሉ አልበም | New Ethiopian Music 2025',
		channel: 'Michael Belayneh',
		language: 'amharic',
		tags: ['michael belayneh', 'amharic', 'music']
	},
	{
		videoId: 'GU2yAO6pTGg',
		title: 'Michael Belayneh - አንድ ቃል - And Qal (Official Music Video)',
		channel: 'Michael Belayneh',
		language: 'amharic',
		tags: ['michael belayneh', 'amharic', 'music']
	},
	{
		videoId: '5tfjPkUk-Kc',
		title: 'Michael Belayneh - አሸነፈ _ Ashenefe Track 02 (Official Audio)',
		channel: 'Michael Belayneh',
		language: 'amharic',
		tags: ['michael belayneh', 'amharic', 'music']
	},
	{
		videoId: 'HZnfRwFKCO8',
		title: 'Betty G - Na Na Demaye [NEW! Music Video 2015',
		channel: 'Betty G',
		language: 'amharic',
		tags: ['betty g', 'amharic', 'music']
	},
	{
		videoId: 'CXqfxcLmOWc',
		title: 'Betty G - Asebehalew [NEW! Hot! Music Video 2015]',
		channel: 'Betty G',
		language: 'amharic',
		tags: ['betty g', 'amharic', 'music']
	},
	{
		videoId: 'GyGjS3Re3gw',
		title: 'Betty G performs Yamlu Molas Sin Jaaladhaa at the 2019 Nobel Peace Prize Ceremony',
		channel: 'Betty G',
		language: 'amharic',
		tags: ['betty g', 'amharic', 'music']
	},
	{
		videoId: '_G5NIqjVTKc',
		title: 'Betty G & Nhatty Man - ከአንተ አይበልጥም kante aybeltim(easy up)',
		channel: 'Betty G',
		language: 'amharic',
		tags: ['betty g', 'amharic', 'music']
	},
	{
		videoId: '_IIIF9f1dcc',
		title: 'Betty G Bruktawit Getahun ft  Nhatty Man Kante Ayebeltim Official Music Video',
		channel: 'Betty G',
		language: 'amharic',
		tags: ['betty g', 'amharic', 'music']
	},
	{
		videoId: '0x7fRqgq3dk',
		title: 'Tsegaye Eshetu - እሄዳለሁ ባቡር ተሳፍሬ  Ethiopia Ol',
		channel: 'Tsegaye Eshetu',
		language: 'amharic',
		tags: ['tsegaye eshetu', 'amharic', 'music']
	},
	{
		videoId: '-NMoxu5gvGg',
		title: 'Tsegaye Eshetu - የሰርግሽ እለት ጥሪው ደርሶኛል Tsegaye Eshetu Lesergua Teterahu ፀጋዬ እሸቱ ለሰርጓ ተጠራሁ Ethiopian Music Lyrics Video',
		channel: 'Tsegaye Eshetu',
		language: 'amharic',
		tags: ['tsegaye eshetu', 'amharic', 'music']
	},
	{
		videoId: 'SKxnX8veBRU',
		title: 'Tsegaye Eshetu - Kinategna | ቅናተኛ - New Ethiopian Music 2026 (Track 09)',
		channel: 'Tsegaye Eshetu',
		language: 'amharic',
		tags: ['tsegaye eshetu', 'amharic', 'music']
	},
	{
		videoId: '2iw1xzGtZdE',
		title: 'Tsegaye Eshetu - Lesergua Teterahu',
		channel: 'Tsegaye Eshetu',
		language: 'amharic',
		tags: ['tsegaye eshetu', 'amharic', 'music']
	},
	{
		videoId: 'rVuTRSJAkXM',
		title: 'Tsegaye Eshetu - Yaye Ale - ፀጋዬ እሸቱ - ያየ አለ - Ethiopian Music',
		channel: 'Tsegaye Eshetu',
		language: 'amharic',
		tags: ['tsegaye eshetu', 'amharic', 'music']
	},
	{
		videoId: 'faXPu5_Y3Cs',
		title: 'Eyob Mekonnen - Yewnetwan new (Official)',
		channel: 'Eyob Mekonnen',
		language: 'amharic',
		tags: ['eyob mekonnen', 'amharic', 'music']
	},
	{
		videoId: 'LT_iqtNv2Xo',
		title: 'Eyob Mekonnen, ነቅጫለሁ Neckchalehu   Best Ethiopian Reggae Song',
		channel: 'Eyob Mekonnen',
		language: 'amharic',
		tags: ['eyob mekonnen', 'amharic', 'music']
	},
	{
		videoId: '-dPh_KrrbNI',
		title: 'Eyob Mekonnen - Eyob Mekonen - Debzezesh',
		channel: 'Eyob Mekonnen',
		language: 'amharic',
		tags: ['eyob mekonnen', 'amharic', 'music']
	},
	{
		videoId: 'Ddpd0s_x_Pg',
		title: 'Eyob Mekonnen - Endatefash - Eyob mekonnen (Lyrics) || እዮብ መኮንን - እንዳጠፋሽ (በግጥም)',
		channel: 'Eyob Mekonnen',
		language: 'amharic',
		tags: ['eyob mekonnen', 'amharic', 'music']
	},
	{
		videoId: 'O0U5u7QjND8',
		title: 'Eyob Mekonnen - (debzzesh) lyrics                 እዮብ መኮንን (ደብዝዘሽ )',
		channel: 'Eyob Mekonnen',
		language: 'amharic',
		tags: ['eyob mekonnen', 'amharic', 'music']
	},
	{
		videoId: 'NyNY-dwncB8',
		title: 'Tsedenia Gebremarkos - Tsedeniya G/Markos - Mech Gebagn | መች ገባኝ -',
		channel: 'Tsedenia Gebremarkos',
		language: 'amharic',
		tags: ['tsedenia gebremarkos', 'amharic', 'music']
	},
	{
		videoId: 'ouvHC_okk4M',
		title: 'Tsedenia Gebremarkos - Tsedenya G/Markos - Himemie New clip New single',
		channel: 'Tsedenia Gebremarkos',
		language: 'amharic',
		tags: ['tsedenia gebremarkos', 'amharic', 'music']
	},
	{
		videoId: 'uvU-Se6O_-s',
		title: 'Tsedenia Gebremarkos - Tsedeniya G/Markos - Gelaye | ገላ_ዬ | Track 7 (Official Lyrics Video) 2026',
		channel: 'Tsedenia Gebremarkos',
		language: 'amharic',
		tags: ['tsedenia gebremarkos', 'amharic', 'music']
	},
	{
		videoId: 'asZszsycNNs',
		title: 'Tsedenia Gebremarkos - Hailu Amerga & Dawit Tsige - Keteraraw mado ( Concert Video ) ኃይሉ አመርጋ ና ዳዊት ፅጌ   ከተራራው ማዶ',
		channel: 'Tsedenia Gebremarkos',
		language: 'amharic',
		tags: ['tsedenia gebremarkos', 'amharic', 'music']
	},
	{
		videoId: 'VKe8Knwd1GU',
		title: 'Tsedenia Gebremarkos - Tsedenia G/ markos - Yefikir Girma New Ethiopian Music 2015 (Official Video)',
		channel: 'Tsedenia Gebremarkos',
		language: 'amharic',
		tags: ['tsedenia gebremarkos', 'amharic', 'music']
	},
	{
		videoId: '1GGV38L-pHE',
		title: 'Dagi Dagne - Awtar Tv - Dagne Walle - Aba Siber - ዳኘ ዋለ -',
		channel: 'Dagi Dagne',
		language: 'amharic',
		tags: ['dagi dagne', 'amharic', 'music']
	},
	{
		videoId: 'SjW0bMSLjTg',
		title: 'Dagi Dagne - Dagi D - Bayish - ዳጊ ዲ - ባይሽ - New Ethiopian Music 2022 (Official Video)',
		channel: 'Dagi Dagne',
		language: 'amharic',
		tags: ['dagi dagne', 'amharic', 'music']
	},
	{
		videoId: 'FR37e7qjjOY',
		title: 'Dagi Dagne - Dagne Wale - Addis Ababa | አዲስ አበባ - New Ethiopian Music 2026 (Official Lyrics Video)',
		channel: 'Dagi Dagne',
		language: 'amharic',
		tags: ['dagi dagne', 'amharic', 'music']
	},
	{
		videoId: 'ytlZdX5ypHQ',
		title: 'Dagi Dagne - #amharamusic dagne walle #ethiopia #ethiopiamusic @abrsh1234',
		channel: 'Dagi Dagne',
		language: 'amharic',
		tags: ['dagi dagne', 'amharic', 'music']
	},
	{
		videoId: 'M4OPtWxNZWs',
		title: 'Dagi Dagne - Wow best #amharic #habesha #ethiopianmusic #duet',
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
		videoId: 'stfNIUlRFTE',
		title: 'Tamrat Desta aykebdm wey Lyrics#ethiopianmusic #tamratdesta',
		channel: 'Tamrat Desta',
		language: 'amharic',
		tags: ['tamrat desta', 'amharic', 'music']
	},
	{
		videoId: '_BhnM6ttH0U',
		title: 'Tamrat Desta - Egnan new mayet ታምራት ደስታ እኛን ነው ማየት amharic music #tamratdesta #tamratdesta',
		channel: 'Tamrat Desta',
		language: 'amharic',
		tags: ['tamrat desta', 'amharic', 'music']
	},
	{
		videoId: 'im-W7D69o9Q',
		title: 'Tamrat Desta Best 6 Musics | ታምራት ደስታ ምርጥ እንቁ ዘፈኖች | Ethiopian Music 2025',
		channel: 'Tamrat Desta',
		language: 'amharic',
		tags: ['tamrat desta', 'amharic', 'music']
	},
	{
		videoId: 'avaxcdxgGJo',
		title: 'Tamrat Desta - Shegnugne',
		channel: 'Tamrat Desta',
		language: 'amharic',
		tags: ['tamrat desta', 'amharic', 'music']
	},
	{
		videoId: '4BN7XzhQpDY',
		title: 'Bisrat Surafel - Man | ማን - New Ethiopian Mus',
		channel: 'Bisrat Surafel',
		language: 'amharic',
		tags: ['bisrat surafel', 'amharic', 'music']
	},
	{
		videoId: '9oTGPuQymJo',
		title: 'Bisrat Surafel - Men Aseba New - ምን አስባ ነዉ (Official Music Video)',
		channel: 'Bisrat Surafel',
		language: 'amharic',
		tags: ['bisrat surafel', 'amharic', 'music']
	},
	{
		videoId: 'VDbLetOWm0E',
		title: 'Bisrat Surafel - Kal Bekal | ቃል በቃል - New Ethiopian Music 2018 (Official Audio)',
		channel: 'Bisrat Surafel',
		language: 'amharic',
		tags: ['bisrat surafel', 'amharic', 'music']
	},
	{
		videoId: 'GAyOagG19sk',
		title: 'Bisrat Surafel - Ehedalehu | እሄዳለሁ - New Ethiopian Music 2018 (Official Audio)',
		channel: 'Bisrat Surafel',
		language: 'amharic',
		tags: ['bisrat surafel', 'amharic', 'music']
	},
	{
		videoId: 'kuoCF8MJEPU',
		title: 'Bisrat Surafel feat  Jah Lude   Yehew Sewyew   New Ethiopian Official Music video',
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
		videoId: '8LIfHo35iKs',
		title: 'Dereje Dubale - ged yelem music lyrics',
		channel: 'Dereje Dubale',
		language: 'amharic',
		tags: ['dereje dubale', 'amharic', 'music']
	},
	{
		videoId: 'yq5kVPvgyG8',
		title: 'Dereje Dubale - Befikresh tasere || ደረጀ ዱባለ - በፍቅርሽ ታስሬ (lyrics)',
		channel: 'Dereje Dubale',
		language: 'amharic',
		tags: ['dereje dubale', 'amharic', 'music']
	},
	{
		videoId: '4X4XDnB0bME',
		title: 'Dereje Dubale - Mewdeden Negriyat | Dereje Dubale | ደረጀ ዱባለ | መውደዴን ነግሪያት | Ethiopian Music | Amharic Music | Lyrics',
		channel: 'Dereje Dubale',
		language: 'amharic',
		tags: ['dereje dubale', 'amharic', 'music']
	},
	{
		videoId: 'rU8PEH1CCDA',
		title: 'Dereje Dubale - Ged Yelem Lebe Yichilal',
		channel: 'Dereje Dubale',
		language: 'amharic',
		tags: ['dereje dubale', 'amharic', 'music']
	},
	{
		videoId: 'xwuN5BlAef0',
		title: 'Alex Olympia - METECHALEHU',
		channel: 'Alex Olympia',
		language: 'amharic',
		tags: ['alex olympia', 'amharic', 'music']
	},
	{
		videoId: 'S_htu8iQBGw',
		title: 'Alex Olympia - Alex Olompia - Zelalem Zelalem (Ethiopian Music)',
		channel: 'Alex Olympia',
		language: 'amharic',
		tags: ['alex olympia', 'amharic', 'music']
	},
	{
		videoId: 'FzubqCpC5kY',
		title: 'Alex Olympia - Alex Olompia - Come in diaspora.mp4',
		channel: 'Alex Olympia',
		language: 'amharic',
		tags: ['alex olympia', 'amharic', 'music']
	},
	{
		videoId: '0Uzah5gquJ4',
		title: 'Alex Olympia - Alex Olompia (አሌክስ ኦሎምፒያ) ሪሓነይ Rihanney New Ethiopian & Eritrean Music 2019 (Official Video)',
		channel: 'Alex Olympia',
		language: 'amharic',
		tags: ['alex olympia', 'amharic', 'music']
	},
	{
		videoId: 'xwXQyj7ZJL0',
		title: 'Alex Olympia    - Maths- Chemistry .mp4',
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
		videoId: 'tnGKy35FCSc',
		title: 'Fitsum Teshale - Hit Track',
		channel: 'Fitsum Teshale',
		language: 'amharic',
		tags: ['fitsum teshale', 'amharic', 'music']
	},
	{
		videoId: 'ZaLp9tVN-CM',
		title: 'Fitsum Teshale - Fitsum Abere - Fikrishima | ፍፁም አበረ | ፍቅርሽማ | New Ethiopian Amharic Music 2026 (Official Video)',
		channel: 'Fitsum Teshale',
		language: 'amharic',
		tags: ['fitsum teshale', 'amharic', 'music']
	},
	{
		videoId: 'dW9B2Tl_liI',
		title: 'Fitsum Teshale - Ethiopian music : Fisum T ፍፁም ቲ ደስ ይላል Dess Yelal New Ethiopian Music 2019(Official Video)',
		channel: 'Fitsum Teshale',
		language: 'amharic',
		tags: ['fitsum teshale', 'amharic', 'music']
	},
	{
		videoId: 'dgMmkQAslQc',
		title: 'Fitsum Teshale - Fisum T   Pretty Woman   New Ethiopian Music 2018 Official Video   YouTube',
		channel: 'Fitsum Teshale',
		language: 'amharic',
		tags: ['fitsum teshale', 'amharic', 'music']
	},
	{
		videoId: '9PXUpv7f-C4',
		title: 'Haimanot Girma - Kezira',
		channel: 'Haimanot Girma',
		language: 'amharic',
		tags: ['haimanot girma', 'amharic', 'music']
	},
	{
		videoId: 'LgI7_0K3Si4',
		title: 'Haimanot Girma - Haymanot Girma - Yemalkeyrew - ሃይማኖት ግርማ  - የማልቀይረዉ - Ethiopian Music',
		channel: 'Haimanot Girma',
		language: 'amharic',
		tags: ['haimanot girma', 'amharic', 'music']
	},
	{
		videoId: '8mZd88wZrxk',
		title: 'Haimanot Girma - Haymanot Girma - ene alsetim ሀይማኖት ግርማ - እኔ አልሰጥም 1996 Gc Ethiopian music',
		channel: 'Haimanot Girma',
		language: 'amharic',
		tags: ['haimanot girma', 'amharic', 'music']
	},
	{
		videoId: '_uSvqWxkGKg',
		title: 'Haimanot Girma - Haymanot Girma - Ishururu (እሽሩሩ) 1996 E.C.',
		channel: 'Haimanot Girma',
		language: 'amharic',
		tags: ['haimanot girma', 'amharic', 'music']
	},
	{
		videoId: 'qmQ2A8_s04c',
		title: 'Haimanot Girma - ሃይማኖት ግርማ በቃ  ከዚራ አልበም | Haimanot Girma Beka Kezira Album',
		channel: 'Haimanot Girma',
		language: 'amharic',
		tags: ['haimanot girma', 'amharic', 'music']
	},
	{
		videoId: 'uVIghBLJFY8',
		title: 'Helen Berhe - Yebereta (የበረታ) | New Ethiopian',
		channel: 'Helen Berhe',
		language: 'amharic',
		tags: ['helen berhe', 'amharic', 'music']
	},
	{
		videoId: 'TREZNDBPLXA',
		title: 'Helen Berhe - Zeyadaye (ዚያዳዬ) | New Ethiopian Music 2026 (Official Video)',
		channel: 'Helen Berhe',
		language: 'amharic',
		tags: ['helen berhe', 'amharic', 'music']
	},
	{
		videoId: '0-bQLbplMz4',
		title: 'Helen Berhe - Munanaye (ሙናናዬ) | New Ethiopian Music 2026 (Official Video)',
		channel: 'Helen Berhe',
		language: 'amharic',
		tags: ['helen berhe', 'amharic', 'music']
	},
	{
		videoId: 'EI_RIkIuVy0',
		title: 'Helen Berhe - Nafkognal (ናፍቆኛል) | New Ethiopian Music 2026 (Official Video)',
		channel: 'Helen Berhe',
		language: 'amharic',
		tags: ['helen berhe', 'amharic', 'music']
	},
	{
		videoId: 'GvBjlXCdsBs',
		title: 'Helen Berhe - Arada (አራዳ) | New Ethiopian Music 2026 (Official Video)',
		channel: 'Helen Berhe',
		language: 'amharic',
		tags: ['helen berhe', 'amharic', 'music']
	},
	{
		videoId: 'xPwlVss7yN8',
		title: 'Lij Michael - የሺ | Yeshi | Ethiopian New Musi',
		channel: 'Lij Michael',
		language: 'amharic',
		tags: ['lij michael', 'amharic', 'music']
	},
	{
		videoId: 'odu765QmBF0',
		title: 'Lij Michael - lij mic - ልጅ ሚካኤል - አለው መሰንቆ - Ethiopian New music Alew Mesenqo Official Video 2023',
		channel: 'Lij Michael',
		language: 'amharic',
		tags: ['lij michael', 'amharic', 'music']
	},
	{
		videoId: 'UKrXRXopxIc',
		title: 'Lij Michael - Lij Michel Faf Arada le Arada (አራዳ ላራዳ)',
		channel: 'Lij Michael',
		language: 'amharic',
		tags: ['lij michael', 'amharic', 'music']
	},
	{
		videoId: '-5tyZKEwXJw',
		title: 'Lij Michael Faf Tecawece Bate (ተጫወቺ ባቲ)',
		channel: 'Lij Michael',
		language: 'amharic',
		tags: ['lij michael', 'amharic', 'music']
	},
	{
		videoId: 'H50SZRIBtJY',
		title: 'Lij Michael - Sami Dan & Lij Michael (Faf) - Ayzosh (አይዞሽ) - New Ethiopian Music Video',
		channel: 'Lij Michael',
		language: 'amharic',
		tags: ['lij michael', 'amharic', 'music']
	},
	{
		videoId: 'VpraLnMvgMw',
		title: 'Tsehaye Yohannes - Betesfa - ፀሐዬ ዮሃንስ - በተስፋ',
		channel: 'Tsehaye Yohannes',
		language: 'amharic',
		tags: ['tsehaye yohannes', 'amharic', 'music']
	},
	{
		videoId: 'dqMaHvS3ntE',
		title: 'Tsehaye Yohannes - Hit Track',
		channel: 'Tsehaye Yohannes',
		language: 'amharic',
		tags: ['tsehaye yohannes', 'amharic', 'music']
	},
	{
		videoId: 'rNDJH9BVNSo',
		title: 'Tsehaye Yohannes - ያውና እዛ ቁጭ ብለሽ ደምቀሽ ትታያለሽ | Yawna eza kuch blesh demkesh titayalesh | Tsehaye betesfa Music',
		channel: 'Tsehaye Yohannes',
		language: 'amharic',
		tags: ['tsehaye yohannes', 'amharic', 'music']
	},
	{
		videoId: 'jWSRjGB3JMU',
		title: 'Tsehaye Yohannes - Hit Track',
		channel: 'Tsehaye Yohannes',
		language: 'amharic',
		tags: ['tsehaye yohannes', 'amharic', 'music']
	},
	{
		videoId: 'QNLw_n_WpDw',
		title: 'Tsehaye Yohannes - Blen | ብሌን (Official Music Video)',
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
		videoId: 'BcXh10KyKTI',
		title: 'Tibebu Workiye – Ligletsilish - ጥበቡ ወርቅዬ - ልግለጽልሽ - Ethiopian Music',
		channel: 'Tibebu Workiye',
		language: 'amharic',
		tags: ['tibebu workiye', 'amharic', 'music']
	},
	{
		videoId: 'ViRiibBCgxk',
		title: 'Tibebu Workiye - Tibebu Workye – Endet - ጥበቡ ወርቅዬ - እንዴት - Ethiopian Music',
		channel: 'Tibebu Workiye',
		language: 'amharic',
		tags: ['tibebu workiye', 'amharic', 'music']
	},
	{
		videoId: 'tMFjk5VwKmE',
		title: 'Tibebu Workiye - Tibebu Workye - Zim - ጥበቡ ወርቅዬ - ዝም - Ethiopian Music',
		channel: 'Tibebu Workiye',
		language: 'amharic',
		tags: ['tibebu workiye', 'amharic', 'music']
	},
	{
		videoId: '8sLbdUC9ovY',
		title: 'Tibebu Workiye - Hit Track',
		channel: 'Tibebu Workiye',
		language: 'amharic',
		tags: ['tibebu workiye', 'amharic', 'music']
	},
	// ============================================================

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
		title: 'The Weeknd - Blinding Lights',
		channel: 'The Weeknd',
		language: 'english',
		tags: ['the weeknd', 'blinding lights', 'r&b', 'synth-pop', 'english', 'music']
	},
	{
		videoId: 'nSDgHBxUbVQ',
		title: 'Ed Sheeran - Photograph',
		channel: 'Ed Sheeran',
		language: 'english',
		tags: ['ed sheeran', 'photograph', 'pop', 'acoustic', 'english', 'music']
	},
	{
		videoId: '60ItHLz5WEA',
		title: 'Alan Walker - Faded',
		channel: 'Alan Walker',
		language: 'english',
		tags: ['alan walker', 'faded', 'edm', 'electronic', 'english', 'music']
	},
	{
		videoId: 'hLQl3WQQoQ0',
		title: 'Adele - Someone Like You',
		channel: 'Adele',
		language: 'english',
		tags: ['adele', 'someone like you', 'soul', 'pop', 'english', 'music']
	},
	{
		videoId: 'lWA2pjMjpBs',
		title: 'Rihanna - Diamonds',
		channel: 'Rihanna',
		language: 'english',
		tags: ['rihanna', 'diamonds', 'pop', 'r&b', 'english', 'music']
	},
	{
		videoId: 'mWRsgZuwf_8',
		title: 'Imagine Dragons - Demons',
		channel: 'Imagine Dragons',
		language: 'english',
		tags: ['imagine dragons', 'demons', 'alternative rock', 'english', 'music']
	},
	{
		videoId: 'lY2yjAdbvdQ',
		title: 'Shawn Mendes - Treat You Better',
		channel: 'Shawn Mendes',
		language: 'english',
		tags: ['shawn mendes', 'treat you better', 'pop', 'acoustic', 'english', 'music']
	},
	{
		videoId: 'TdrL3QxjyVw',
		title: 'Lana Del Rey - Summertime Sadness',
		channel: 'Lana Del Rey',
		language: 'english',
		tags: ['lana del rey', 'summertime sadness', 'indie', 'dream pop', 'english', 'music']
	},
	{
		videoId: 'S9bCLPwzSC0',
		title: 'Eminem - Mockingbird',
		channel: 'Eminem',
		language: 'english',
		tags: ['eminem', 'mockingbird', 'hip-hop', 'rap', 'english', 'music']
	},
	{
		videoId: 'cxjvTXo9WWM',
		title: 'Sia - Unstoppable',
		channel: 'Sia',
		language: 'english',
		tags: ['sia', 'unstoppable', 'pop', 'english', 'music']
	},
	{
		videoId: 'oyEuk8j8imI',
		title: 'Justin Bieber - Love Yourself',
		channel: 'Justin Bieber',
		language: 'english',
		tags: ['justin bieber', 'love yourself', 'pop', 'r&b', 'english', 'music']
	},
	{
		videoId: 'K-a8s8OLBSE',
		title: 'Taylor Swift - Cardigan',
		channel: 'Taylor Swift',
		language: 'english',
		tags: ['taylor swift', 'cardigan', 'folk', 'pop', 'english', 'music']
	},
	{
		videoId: '50VNCymT-Cs',
		title: 'Alec Benjamin - Let Me Down Slowly',
		channel: 'Alec Benjamin',
		language: 'english',
		tags: ['alec benjamin', 'let me down slowly', 'indie pop', 'storytelling', 'english', 'music']
	},
	{
		videoId: 'SlPhMPnQ58k',
		title: 'Maroon 5 - Memories',
		channel: 'Maroon 5',
		language: 'english',
		tags: ['maroon 5', 'memories', 'pop rock', 'english', 'music']
	},
	{
		videoId: 'Ahha3Cqe_fk',
		title: 'Katy Perry - The One That Got Away',
		channel: 'Katy Perry',
		language: 'english',
		tags: ['katy perry', 'the one that got away', 'dance pop', 'english', 'music']
	},
	{
		videoId: 'MwpMEbgC7DA',
		title: 'Tom Odell - Another Love',
		channel: 'Tom Odell',
		language: 'english',
		tags: ['tom odell', 'another love', 'piano pop', 'indie', 'english', 'music']
	},
	{
		videoId: 'DW3tI9HCslo',
		title: 'XXXTentacion - SAD!',
		channel: 'XXXTentacion',
		language: 'english',
		tags: ['xxxtentacion', 'sad', 'emo rap', 'alternative', 'english', 'music']
	},
	{
		videoId: 'L3wKzyIN1yk',
		title: 'Rag\'n\'Bone Man - Human',
		channel: 'Rag\'n\'Bone Man',
		language: 'english',
		tags: ['rag\'n\'bone man', 'human', 'soul', 'blues', 'english', 'music']
	},
	{
		videoId: 'pRpeEdMmmQ0',
		title: 'Shakira - Waka Waka (This Time for Africa)',
		channel: 'Shakira',
		language: 'english',
		tags: ['shakira', 'waka waka', 'latin pop', 'dance', 'english', 'music']
	},
	{
		videoId: 'VPRjCeoBqrI',
		title: 'Coldplay - A Sky Full of Stars',
		channel: 'Coldplay',
		language: 'english',
		tags: ['coldplay', 'a sky full of stars', 'alternative rock', 'pop', 'english', 'music']
	},
	{
		videoId: 'V1Pl8CzNzCw',
		title: 'Billie Eilish, Khalid - Lovely',
		channel: 'Billie Eilish',
		language: 'english',
		tags: ['billie eilish', 'lovely', 'dark pop', 'alternative', 'english', 'music']
	},
	{
		videoId: 'zABLecsR5UE',
		title: 'Lewis Capaldi - Someone You Loved',
		channel: 'Lewis Capaldi',
		language: 'english',
		tags: ['lewis capaldi', 'someone you loved', 'emotional pop', 'english', 'music']
	},
	{
		videoId: 'UtF6Jej8yb4',
		title: 'Avicii - The Nights',
		channel: 'Avicii',
		language: 'english',
		tags: ['avicii', 'the nights', 'edm', 'progressive house', 'english', 'music']
	},
	{
		videoId: 'hT_nvWreIhg',
		title: 'OneRepublic - Counting Stars',
		channel: 'OneRepublic',
		language: 'english',
		tags: ['onerepublic', 'counting stars', 'pop rock', 'english', 'music']
	},
	{
		videoId: '0yW7w8F2TVA',
		title: 'James Arthur - Say You Won\'t Let Go',
		channel: 'James Arthur',
		language: 'english',
		tags: ['james arthur', 'say you wont let go', 'pop', 'soul', 'english', 'music']
	},
	{
		videoId: 'JRfuAukYTKg',
		title: 'David Guetta - Titanium (feat. Sia)',
		channel: 'David Guetta',
		language: 'english',
		tags: ['david guetta', 'titanium', 'edm', 'dance pop', 'english', 'music']
	},
	{
		videoId: 'TUVcZfQe-Kw',
		title: 'Dua Lipa - Levitating',
		channel: 'Dua Lipa',
		language: 'english',
		tags: ['dua lipa', 'levitating', 'dance pop', 'disco', 'english', 'music']
	},
	{
		videoId: 'IPfJnp1guPc',
		title: 'Khalid - Young Dumb & Broke',
		channel: 'Khalid',
		language: 'english',
		tags: ['khalid', 'young dumb & broke', 'r&b', 'chill pop', 'english', 'music']
	},
	{
		videoId: '3AtDnEC4zak',
		title: 'Charlie Puth - We Don\'t Talk Anymore (feat. Selena Gomez)',
		channel: 'Charlie Puth',
		language: 'english',
		tags: ['charlie puth', 'we dont talk anymore', 'pop', 'r&b', 'english', 'music']
	},
	{
		videoId: 'BcqxLCWn-CE',
		title: 'Lauv - I Like Me Better',
		channel: 'Lauv',
		language: 'english',
		tags: ['lauv', 'i like me better', 'indie pop', 'emotional', 'english', 'music']
	},
	{
		videoId: 'I0czvJ_jikg',
		title: 'Dean Lewis - Be Alright',
		channel: 'Dean Lewis',
		language: 'english',
		tags: ['dean lewis', 'be alright', 'pop', 'acoustic', 'english', 'music']
	},
	{
		videoId: 'Oa_RSwwpPaA',
		title: 'Benson Boone - Beautiful Things',
		channel: 'Benson Boone',
		language: 'english',
		tags: ['benson boone', 'beautiful things', 'pop rock', 'english', 'music']
	},
	{
		videoId: '51u5fnyrGj4',
		title: 'Duncan Laurence - Arcade',
		channel: 'Duncan Laurence',
		language: 'english',
		tags: ['duncan laurence', 'arcade', 'pop', 'emotional', 'english', 'music']
	},
	{
		videoId: 'fbHbTBP_u7U',
		title: 'NF - Let You Down',
		channel: 'NF',
		language: 'english',
		tags: ['nf', 'let you down', 'hip-hop', 'rap', 'english', 'music']
	},
	{
		videoId: 'PVjiKRfKpPI',
		title: 'Hozier - Take Me to Church',
		channel: 'Hozier',
		language: 'english',
		tags: ['hozier', 'take me to church', 'indie rock', 'soul', 'english', 'music']
	},
	{
		videoId: 'RBumgq5yVrA',
		title: 'Passenger - Let Her Go',
		channel: 'Passenger',
		language: 'english',
		tags: ['passenger', 'let her go', 'folk pop', 'acoustic', 'english', 'music']
	},
	{
		videoId: 'u2ah9tWTkmk',
		title: 'Alex Warren - Ordinary',
		channel: 'Alex Warren',
		language: 'english',
		tags: ['alex warren', 'ordinary', 'pop', 'storytelling', 'english', 'music']
	},
	{
		videoId: 'eVTXPUF4Oz4',
		title: 'Linkin Park - In the End',
		channel: 'Linkin Park',
		language: 'english',
		tags: ['linkin park', 'in the end', 'alternative rock', 'nu metal', 'english', 'music']
	},
	{
		videoId: 'GCdwKhTtNNw',
		title: 'The Neighbourhood - Sweater Weather',
		channel: 'The Neighbourhood',
		language: 'english',
		tags: ['the neighbourhood', 'sweater weather', 'indie rock', 'alternative', 'english', 'music']
	},
	{
		videoId: 'e2vBLd5Egnk',
		title: 'Martin Garrix & Dua Lipa - Scared to Be Lonely',
		channel: 'Martin Garrix',
		language: 'english',
		tags: ['martin garrix', 'scared to be lonely', 'future bass', 'edm', 'english', 'music']
	}
];

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
		'alec benjamin',
		'alemayehu eshete',
		'alex olympia',
		'alex warren',
		'alula mampa',
		'amanuel yemane',
		'amir dawud',
		'anbessa tekle',
		'ariana grande',
		'aster aweke',
		'avicii',
		'benson boone',
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
		'david guetta',
		'dawit alemayehu',
		'dawit nega',
		'dawit tsige',
		'dean lewis',
		'dereje dubale',
		'drake',
		'dua lipa',
		'duncan laurence',
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
		'hozier',
		'imagine dragons',
		'james arthur',
		'justin bieber',
		'katy perry',
		'kendrick lamar',
		'khalid',
		'kiros alemayehu',
		'lady gaga',
		'lana del rey',
		'lauv',
		'lewis capaldi',
		'lij michael',
		'linkin park',
		'mahmoud ahmed',
		'maroon 5',
		'martin garrix',
		'merkeb bonitua',
		'mesfin berhanu',
		'michael belayneh',
		'michael jackson',
		'muluken melesse',
		'nahom yohannes',
		'neguse abadi',
		'nf',
		'onerepublic',
		'passenger',
		'post malone',
		'queen',
		'rag\'n\'bone man',
		'rag n bone man',
		'rahel haile',
		'rihanna',
		'robel michael',
		'rophnan',
		'sam smith',
		'shakira',
		'shawn mendes',
		'shewit mezgebo',
		'sia',
		'solomon bayre',
		'solomon haile',
		'tamrat desta',
		'taylor swift',
		'teddy afro',
		'the neighbourhood',
		'the neighborhood',
		'the weeknd',
		'tibebu workiye',
		'tilahun gessesse',
		'timnit welday',
		'tom odell',
		'tsedenia gebremarkos',
		'tsegaye eshetu',
		'tsehaye yohannes',
		'xxxtentacion',
		'zemen alemseged'
	];

	for (const s of KNOWN_SINGERS) {
		if (combined.includes(s)) {
			if (s.includes('abraham') || s.includes('abreham')) return 'abraham gebremedhin';
			if (s.includes('eden')) return 'eden gebreselassie';
			if (s.includes('the neighbourhood') || s.includes('the neighborhood')) return 'the neighbourhood';
			if (s.includes('rag\'n\'bone') || s.includes('rag n bone')) return 'rag\'n\'bone man';
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
export function getRelatedTrackSync(
	currentTrack?: { videoId?: string | null; title?: string; channel?: string; genre?: string } | null,
	playedVideoIds: Set<string> = new Set()
): { videoId: string; title: string; channel: string; language?: MusicLanguage } {
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

export async function getRelatedYouTubeTrack(
	currentTrack?: { videoId?: string | null; title?: string; channel?: string; genre?: string } | null,
	playedVideoIds: Set<string> = new Set()
): Promise<{ videoId: string; title: string; channel: string; language?: MusicLanguage }> {
	return getRelatedTrackSync(currentTrack, playedVideoIds);
}
