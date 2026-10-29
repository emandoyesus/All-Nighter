/**
 * Web Audio Procedural Ambient Music Engine.
 * Generates soft, endless, evolving "Midnight Chords" ambient music locally with zero external audio assets.
 * Progression: Dm9 -> Bbmaj7 -> Fmaj9 -> Am7 with slow analog tape flutter, sub-bass warmth, and generative Rhodes chime droplets.
 */

const LS_MUSIC_PLAYING = 'an.ambient_music_play';
const LS_MUSIC_VOL = 'an.ambient_music_vol';

class AmbientMusicEngine {
	isPlaying = $state<boolean>(false);
	volume = $state<number>(45);
	currentChord = $state<string>('Dm9');

	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private filterNode: BiquadFilterNode | null = null;
	private delayNode: DelayNode | null = null;
	private delayFeedback: GainNode | null = null;
	private delayFilter: BiquadFilterNode | null = null;

	// Loop management
	private chordTimer: number | null = null;
	private chimeTimer: number | null = null;
	private tapeHissSource: AudioBufferSourceNode | null = null;
	private tapeHissGain: GainNode | null = null;
	private activeChordNodes: { stop: () => void }[] = [];
	private chordIndex = 0;

	// The Midnight Chords progression:
	private readonly chords = [
		{ name: 'Dm9', notes: [146.83, 220.00, 261.63, 329.63, 440.00] }, // D3, A3, C4, E4, A4
		{ name: 'Bbmaj7', notes: [116.54, 174.61, 220.00, 293.66, 349.23] }, // Bb2, F3, A3, D4, F4
		{ name: 'Fmaj9', notes: [87.31, 174.61, 261.63, 329.63, 392.00] }, // F2, F3, C4, E4, G4
		{ name: 'Am7', notes: [110.00, 164.81, 220.00, 261.63, 392.00] }   // A2, E3, A3, C4, G4
	];

	constructor() {
		if (typeof window !== 'undefined') {
			try {
				const savedVol = localStorage.getItem(LS_MUSIC_VOL);
				if (savedVol !== null) {
					const v = Number(savedVol);
					if (Number.isFinite(v) && v >= 0 && v <= 100) this.volume = v;
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
				this.setupAudioGraph(this.ctx);
			}
			return this.ctx;
		} catch {
			return null;
		}
	}

	private setupAudioGraph(ac: AudioContext): void {
		// Master Output
		this.masterGain = ac.createGain();
		this.masterGain.gain.setValueAtTime((this.volume / 100) * 0.35, ac.currentTime);
		this.masterGain.connect(ac.destination);

		// Master Warm Lowpass Filter
		this.filterNode = ac.createBiquadFilter();
		this.filterNode.type = 'lowpass';
		this.filterNode.frequency.setValueAtTime(750, ac.currentTime);
		this.filterNode.Q.setValueAtTime(0.7, ac.currentTime);
		this.filterNode.connect(this.masterGain);

		// Spatial Delay / Reverb Simulation
		this.delayNode = ac.createDelay();
		this.delayNode.delayTime.setValueAtTime(0.48, ac.currentTime);

		this.delayFeedback = ac.createGain();
		this.delayFeedback.gain.setValueAtTime(0.42, ac.currentTime);

		this.delayFilter = ac.createBiquadFilter();
		this.delayFilter.type = 'lowpass';
		this.delayFilter.frequency.setValueAtTime(1200, ac.currentTime);

		// Delay loop: delay -> filter -> feedback -> delay
		this.delayNode.connect(this.delayFilter);
		this.delayFilter.connect(this.delayFeedback);
		this.delayFeedback.connect(this.delayNode);

		// Send delay output to master
		const delayWet = ac.createGain();
		delayWet.gain.setValueAtTime(0.28, ac.currentTime);
		this.delayFilter.connect(delayWet);
		delayWet.connect(this.masterGain);
	}

	setVolume(val: number): void {
		this.volume = Math.max(0, Math.min(100, val));
		try {
			localStorage.setItem(LS_MUSIC_VOL, String(this.volume));
		} catch {}
		if (this.masterGain && this.ctx) {
			const target = (this.volume / 100) * 0.35;
			this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
		}
	}

	toggle(): void {
		if (this.isPlaying) {
			this.pause();
		} else {
			this.play();
		}
	}

	play(): void {
		const ac = this.getContext();
		if (!ac || !this.masterGain) return;

		if (ac.state === 'suspended') {
			ac.resume();
		}

		// Fade in master gain smoothly
		const target = (this.volume / 100) * 0.35;
		this.masterGain.gain.cancelScheduledValues(ac.currentTime);
		this.masterGain.gain.setValueAtTime(0.0001, ac.currentTime);
		this.masterGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, target), ac.currentTime + 1.2);

		this.isPlaying = true;
		this.chordIndex = 0;
		this.startLoops();

		try {
			localStorage.setItem(LS_MUSIC_PLAYING, '1');
		} catch {}
	}

	pause(): void {
		if (!this.isPlaying) return;
		this.isPlaying = false;

		if (this.ctx && this.masterGain) {
			this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
			this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), this.ctx.currentTime);
			this.masterGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
		}

		window.setTimeout(() => {
			this.stopLoops();
		}, 850);

		try {
			localStorage.setItem(LS_MUSIC_PLAYING, '0');
		} catch {}
	}

	private startLoops(): void {
		const ac = this.getContext();
		if (!ac) return;

		this.buildTapeHissTexture(ac);
		this.playNextChord();
		this.chordTimer = window.setInterval(() => {
			this.playNextChord();
		}, 9000);

		this.scheduleNextChime();
	}

	private stopLoops(): void {
		if (this.chordTimer !== null) {
			window.clearInterval(this.chordTimer);
			this.chordTimer = null;
		}
		if (this.chimeTimer !== null) {
			window.clearTimeout(this.chimeTimer);
			this.chimeTimer = null;
		}

		for (const node of this.activeChordNodes) {
			node.stop();
		}
		this.activeChordNodes = [];

		if (this.tapeHissSource) {
			try {
				this.tapeHissSource.stop();
				this.tapeHissSource.disconnect();
			} catch {}
			this.tapeHissSource = null;
		}
	}

	private playNextChord(): void {
		const ac = this.getContext();
		if (!ac || !this.filterNode) return;

		const chord = this.chords[this.chordIndex % this.chords.length];
		this.currentChord = chord.name;
		this.chordIndex++;

		const chordDuration = 9.0;
		const attack = 3.0;
		const release = 4.0;

		const chordGain = ac.createGain();
		chordGain.gain.setValueAtTime(0.0001, ac.currentTime);
		chordGain.gain.linearRampToValueAtTime(0.14, ac.currentTime + attack);
		chordGain.gain.setValueAtTime(0.14, ac.currentTime + chordDuration - release);
		chordGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + chordDuration + 0.5);

		chordGain.connect(this.filterNode);

		// Sub-bass root oscillator
		const subOsc = ac.createOscillator();
		const subGain = ac.createGain();
		subOsc.type = 'sine';
		subOsc.frequency.setValueAtTime(chord.notes[0], ac.currentTime);
		subGain.gain.setValueAtTime(0.24, ac.currentTime);
		subOsc.connect(subGain);
		subGain.connect(chordGain);
		subOsc.start(ac.currentTime);
		subOsc.stop(ac.currentTime + chordDuration + 0.6);

		const voices: OscillatorNode[] = [subOsc];

		// Harmonic pad voices (dual slightly-detuned triangle waves for rich warmth)
		for (let i = 1; i < chord.notes.length; i++) {
			const freq = chord.notes[i];

			const oscA = ac.createOscillator();
			const oscB = ac.createOscillator();

			oscA.type = 'triangle';
			oscB.type = 'sine';

			oscA.frequency.setValueAtTime(freq, ac.currentTime);
			oscB.frequency.setValueAtTime(freq, ac.currentTime);

			oscA.detune.setValueAtTime(-5, ac.currentTime);
			oscB.detune.setValueAtTime(+5, ac.currentTime);

			const voiceGain = ac.createGain();
			const volScale = i === 1 ? 0.16 : 0.12;
			voiceGain.gain.setValueAtTime(volScale, ac.currentTime);

			oscA.connect(voiceGain);
			oscB.connect(voiceGain);
			voiceGain.connect(chordGain);

			oscA.start(ac.currentTime);
			oscB.start(ac.currentTime);
			oscA.stop(ac.currentTime + chordDuration + 0.6);
			oscB.stop(ac.currentTime + chordDuration + 0.6);

			voices.push(oscA, oscB);
		}

		const nodeItem = {
			stop: () => {
				try {
					chordGain.gain.cancelScheduledValues(ac.currentTime);
					chordGain.gain.setValueAtTime(Math.max(0.0001, chordGain.gain.value), ac.currentTime);
					chordGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.6);
					window.setTimeout(() => {
						for (const v of voices) {
							try {
								v.stop();
								v.disconnect();
							} catch {}
						}
						chordGain.disconnect();
					}, 650);
				} catch {}
			}
		};

		this.activeChordNodes.push(nodeItem);

		if (this.activeChordNodes.length > 3) {
			this.activeChordNodes.shift();
		}
	}

	private scheduleNextChime(): void {
		if (!this.isPlaying) return;
		const delay = 3500 + Math.random() * 5000;

		this.chimeTimer = window.setTimeout(() => {
			this.playChimeNote();
			this.scheduleNextChime();
		}, delay);
	}

	private playChimeNote(): void {
		const ac = this.getContext();
		if (!ac || !this.filterNode || !this.delayNode) return;

		// Pentatonic / modal scale frequencies for gentle bells:
		// D4, F4, G4, A4, C5, D5, E5, F5
		const scale = [293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 659.25, 698.46];
		const note = scale[Math.floor(Math.random() * scale.length)];

		// Primary bell oscillator
		const osc = ac.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(note, ac.currentTime);

		// Harmonic tine overtone (~2.76x)
		const tine = ac.createOscillator();
		tine.type = 'sine';
		tine.frequency.setValueAtTime(note * 2.76, ac.currentTime);

		const noteGain = ac.createGain();
		noteGain.gain.setValueAtTime(0.0001, ac.currentTime);
		noteGain.gain.linearRampToValueAtTime(0.07 + Math.random() * 0.05, ac.currentTime + 0.02);
		noteGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 2.8);

		const tineGain = ac.createGain();
		tineGain.gain.setValueAtTime(0.02, ac.currentTime);
		tineGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.6);

		osc.connect(noteGain);
		tine.connect(tineGain);
		tineGain.connect(noteGain);

		noteGain.connect(this.filterNode);
		noteGain.connect(this.delayNode);

		osc.start(ac.currentTime);
		tine.start(ac.currentTime);
		osc.stop(ac.currentTime + 3.0);
		tine.stop(ac.currentTime + 0.8);
	}

	private buildTapeHissTexture(ac: AudioContext): void {
		const bufferSize = ac.sampleRate * 3;
		const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
		const data = buffer.getChannelData(0);
		let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0;

		for (let i = 0; i < bufferSize; i++) {
			const white = Math.random() * 2 - 1;
			b0 = 0.99886 * b0 + white * 0.0555;
			b1 = 0.99332 * b1 + white * 0.0750;
			b2 = 0.96900 * b2 + white * 0.1538;
			b3 = 0.86650 * b3 + white * 0.3104;
			b4 = 0.55000 * b4 + white * 0.5329;
			data[i] = (b0 + b1 + b2 + b3 + b4) * 0.04;
		}

		const noise = ac.createBufferSource();
		noise.buffer = buffer;
		noise.loop = true;

		const lowpass = ac.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.setValueAtTime(1100, ac.currentTime);

		const highpass = ac.createBiquadFilter();
		highpass.type = 'highpass';
		highpass.frequency.setValueAtTime(450, ac.currentTime);

		this.tapeHissGain = ac.createGain();
		this.tapeHissGain.gain.setValueAtTime(0.02, ac.currentTime);

		noise.connect(lowpass);
		lowpass.connect(highpass);
		highpass.connect(this.tapeHissGain);
		this.tapeHissGain.connect(this.masterGain!);

		noise.start();
		this.tapeHissSource = noise;
	}
}

export const ambientMusic = new AmbientMusicEngine();
