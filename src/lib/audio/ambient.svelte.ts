/**
 * Web Audio procedural ambient background noise generator.
 * Synthesizes Rain, Vinyl crackle, and Tape hiss locally with zero external audio assets.
 */

export type AmbientType = 'none' | 'rain' | 'vinyl' | 'tape';

const LS_AMBIENT = 'an.ambient_type';
const LS_VOL = 'an.ambient_vol';

class AmbientSoundEngine {
	type = $state<AmbientType>('none');
	volume = $state<number>(50);
	isPlaying = $state<boolean>(false);

	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private activeNodes: { stop: () => void } | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			try {
				const savedType = localStorage.getItem(LS_AMBIENT) as AmbientType | null;
				if (savedType && ['none', 'rain', 'vinyl', 'tape'].includes(savedType)) {
					this.type = savedType;
				}
				const savedVol = localStorage.getItem(LS_VOL);
				if (savedVol !== null) {
					const v = Number(savedVol);
					if (Number.isFinite(v) && v >= 0 && v <= 100) {
						this.volume = v === 35 ? 50 : v;
					}
				} else {
					this.volume = 50;
				}
			} catch {}
		}
	}

	private getContext(): AudioContext | null {
		if (typeof window === 'undefined') return null;
		try {
			const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
			if (!AudioCtx) return null;
			if (!this.ctx || this.ctx.state === 'closed') {
				this.ctx = new AudioCtx();
			}
			if (this.ctx.state === 'suspended') {
				this.ctx.resume().catch(() => {});
			}
			if (!this.masterGain && this.ctx) {
				this.masterGain = this.ctx.createGain();
				this.masterGain.gain.setValueAtTime((this.volume / 100) * 0.55, this.ctx.currentTime);
				this.masterGain.connect(this.ctx.destination);
			}
			return this.ctx;
		} catch {
			return null;
		}
	}

	setVolume(val: number): void {
		this.volume = Math.max(0, Math.min(100, val));
		try {
			localStorage.setItem(LS_VOL, String(this.volume));
		} catch {}
		if (this.masterGain && this.ctx) {
			this.masterGain.gain.setTargetAtTime((this.volume / 100) * 0.55, this.ctx.currentTime, 0.05);
		}
	}

	setType(next: AmbientType): void {
		if (this.type === next && this.isPlaying) {
			// Toggle off if same type clicked
			this.stop();
			this.type = 'none';
			try {
				localStorage.setItem(LS_AMBIENT, 'none');
			} catch {}
			return;
		}

		this.stop();
		this.type = next;
		try {
			localStorage.setItem(LS_AMBIENT, next);
		} catch {}

		if (next !== 'none') {
			this.start();
		}
	}

	start(): void {
		if (this.type === 'none') return;
		const ac = this.getContext();
		if (!ac || !this.masterGain) return;

		this.stop();

		if (this.type === 'rain') {
			this.activeNodes = this.buildRain(ac, this.masterGain);
		} else if (this.type === 'vinyl') {
			this.activeNodes = this.buildVinyl(ac, this.masterGain);
		} else if (this.type === 'tape') {
			this.activeNodes = this.buildTape(ac, this.masterGain);
		}

		this.isPlaying = true;
	}

	stop(): void {
		if (this.activeNodes) {
			try {
				this.activeNodes.stop();
			} catch {}
			this.activeNodes = null;
		}
		this.isPlaying = false;
	}

	private buildNoiseBuffer(ac: AudioContext, seconds = 4): AudioBuffer {
		const bufferSize = ac.sampleRate * seconds;
		const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
		const data = buffer.getChannelData(0);
		let b0 = 0,
			b1 = 0,
			b2 = 0,
			b3 = 0,
			b4 = 0,
			b5 = 0,
			b6 = 0;

		// Generate pink noise approximation
		for (let i = 0; i < bufferSize; i++) {
			const white = Math.random() * 2 - 1;
			b0 = 0.99886 * b0 + white * 0.0555179;
			b1 = 0.99332 * b1 + white * 0.0750759;
			b2 = 0.969 * b2 + white * 0.153852;
			b3 = 0.8665 * b3 + white * 0.3104856;
			b4 = 0.55 * b4 + white * 0.5329522;
			b5 = -0.7616 * b5 - white * 0.016898;
			data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
			b6 = white * 0.115926;
		}
		return buffer;
	}

	private buildRain(ac: AudioContext, dest: GainNode) {
		const noise = ac.createBufferSource();
		noise.buffer = this.buildNoiseBuffer(ac, 5);
		noise.loop = true;

		// Lowpass filter for muffled rain
		const lowpass = ac.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.setValueAtTime(850, ac.currentTime);

		// Bandpass for gentle shower resonance
		const bandpass = ac.createBiquadFilter();
		bandpass.type = 'bandpass';
		bandpass.frequency.setValueAtTime(400, ac.currentTime);
		bandpass.Q.setValueAtTime(0.8, ac.currentTime);

		// Gentle LFO to simulate rain gust variations
		const lfo = ac.createOscillator();
		const lfoGain = ac.createGain();
		lfo.frequency.setValueAtTime(0.2, ac.currentTime);
		lfoGain.gain.setValueAtTime(150, ac.currentTime);
		lfo.connect(lfoGain);
		lfoGain.connect(bandpass.frequency);

		noise.connect(lowpass);
		lowpass.connect(bandpass);
		bandpass.connect(dest);

		noise.start();
		lfo.start();

		return {
			stop: () => {
				try {
					noise.stop();
					lfo.stop();
					noise.disconnect();
					lowpass.disconnect();
					bandpass.disconnect();
				} catch {}
			}
		};
	}

	private buildVinyl(ac: AudioContext, dest: GainNode) {
		// Low rumble
		const noise = ac.createBufferSource();
		noise.buffer = this.buildNoiseBuffer(ac, 3);
		noise.loop = true;

		const highpass = ac.createBiquadFilter();
		highpass.type = 'highpass';
		highpass.frequency.setValueAtTime(2500, ac.currentTime);

		const vinylGain = ac.createGain();
		vinylGain.gain.setValueAtTime(0.35, ac.currentTime);

		noise.connect(highpass);
		highpass.connect(vinylGain);
		vinylGain.connect(dest);
		noise.start();

		// Sparse pops
		let timer: number | null = null;
		const schedulePop = () => {
			const delay = 120 + Math.random() * 850;
			timer = window.setTimeout(() => {
				try {
					const osc = ac.createOscillator();
					const popGain = ac.createGain();
					osc.type = 'square';
					osc.frequency.setValueAtTime(80 + Math.random() * 240, ac.currentTime);

					popGain.gain.setValueAtTime(0.18 + Math.random() * 0.15, ac.currentTime);
					popGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.015);

					osc.connect(popGain);
					popGain.connect(dest);

					osc.start();
					osc.stop(ac.currentTime + 0.02);
					schedulePop();
				} catch {}
			}, delay);
		};
		schedulePop();

		return {
			stop: () => {
				if (timer !== null) clearTimeout(timer);
				try {
					noise.stop();
					noise.disconnect();
					highpass.disconnect();
					vinylGain.disconnect();
				} catch {}
			}
		};
	}

	private buildTape(ac: AudioContext, dest: GainNode) {
		const noise = ac.createBufferSource();
		noise.buffer = this.buildNoiseBuffer(ac, 4);
		noise.loop = true;

		const lowpass = ac.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.setValueAtTime(1400, ac.currentTime);

		const highpass = ac.createBiquadFilter();
		highpass.type = 'highpass';
		highpass.frequency.setValueAtTime(300, ac.currentTime);

		noise.connect(lowpass);
		lowpass.connect(highpass);
		highpass.connect(dest);
		noise.start();

		return {
			stop: () => {
				try {
					noise.stop();
					noise.disconnect();
					lowpass.disconnect();
					highpass.disconnect();
				} catch {}
			}
		};
	}
}

export const ambient = new AmbientSoundEngine();
