export const INTERSTELLAR_VIDEO_ID = 'UDVtMYqUAyw';

const LS_SITE_SOUND = 'an.site_sound';
const LS_SITE_VOL = 'an.site_sound_vol';

class SiteAudioEngine {
	isPlaying = $state<boolean>(false);
	volume = $state<number>(75);
	ready = $state<boolean>(false);

	constructor() {
		if (typeof window !== 'undefined') {
			try {
				const savedPlay = localStorage.getItem(LS_SITE_SOUND);
				if (savedPlay === '1') {
					this.isPlaying = true;
				}
				const savedVol = localStorage.getItem(LS_SITE_VOL);
				if (savedVol !== null) {
					const v = Number(savedVol);
					if (Number.isFinite(v) && v >= 0 && v <= 100) {
						this.volume = v;
					}
				}
			} catch {}
		}
	}

	play(): void {
		this.isPlaying = true;
		try {
			localStorage.setItem(LS_SITE_SOUND, '1');
		} catch {}
	}

	pause(): void {
		this.isPlaying = false;
		try {
			localStorage.setItem(LS_SITE_SOUND, '0');
		} catch {}
	}

	toggle(): void {
		if (this.isPlaying) {
			this.pause();
		} else {
			this.play();
		}
	}

	setVolume(val: number): void {
		this.volume = Math.max(0, Math.min(100, Math.round(val)));
		try {
			localStorage.setItem(LS_SITE_VOL, String(this.volume));
		} catch {}
	}
}

export const siteAudio = new SiteAudioEngine();
