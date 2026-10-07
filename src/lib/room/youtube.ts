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
