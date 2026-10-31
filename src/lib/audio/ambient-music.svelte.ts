/**
 * Web Audio Procedural Ambient Music Engine.
 * Generates soft, endless, evolving "Nocturne" ambient music locally with zero external audio assets.
 * Progression: Cmaj9 -> Am9 -> Fmaj9 -> G6/9 with warm analog breathing pads,
 * ultra-soft sine wave layers, subtle tape flutter, and delicate raindrop chime echoes.
 */

const LS_MUSIC_PLAYING = 'an.ambient_music_play';
const LS_MUSIC_VOL = 'an.ambient_music_vol';

interface AmbientChord {
	name: string;
	root: number;
	padNotes: number[];
}

class AmbientMusicEngine {
	isPlaying = $state<boolean>(false);
	volume = $state<number>(45);
	currentChord = $state<string>('Cmaj9');

	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private filterNode: BiquadFilterNode | null = null;
	private delayNode: DelayNode | null = null;
	private delayFeedback: GainNode | null = null;
	private delayFilter: BiquadFilterNode | null = null;

	// Breath LFO for living analog warmth
	private lfoOsc: OscillatorNode | null = null;
	private lfoGain: GainNode | null = null;

	// Loop management
	private chordTimer: number | null = null;
	private chimeTimer: number | null = null;
	private warmNoiseSource: AudioBufferSourceNode | null = null;
	private warmNoiseGain: GainNode | null = null;
	private activeChordNodes: { stop: () => void }[] = [];
	private chordIndex = 0;

	// The Silky Nocturne Chord Progression (open, warm, floating voicings)
	private readonly chords: AmbientChord[] = [
		{
			name: 'Cmaj9',
			root: 65.41, // C2 sub
			padNotes: [130.81, 196.0, 246.94, 293.66, 392.0] // C3, G3, B3, D4, G4
		},
		{
			name: 'Am9',
			root: 55.0, // A1 sub
			padNotes: [110.0, 164.81, 220.0, 261.63, 329.63] // A2, E3, A3, C4, E4
		},
		{
			name: 'Fmaj9',
			root: 87.31, // F2 sub
			padNotes: [130.81, 174.61, 220.0, 261.63, 329.63, 392.0] // C3, F3, A3, C4, E4, G4
		},
		{
			name: 'G6/9',
			root: 98.0, // G2 sub
			padNotes: [146.83, 196.0, 246.94, 293.66, 440.0] // D3, G3, B3, D4, A4
		}
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

		// Master Warm Lowpass Filter (silky curve, rolls off harsh highs)
		this.filterNode = ac.createBiquadFilter();
		this.filterNode.type = 'lowpass';
		this.filterNode.frequency.setValueAtTime(480, ac.currentTime);
		this.filterNode.Q.setValueAtTime(0.5, ac.currentTime);
		this.filterNode.connect(this.masterGain);

		// Gentle organic filter breathing LFO (ultra-slow 0.06Hz sweep)
		try {
			this.lfoOsc = ac.createOscillator();
			this.lfoGain = ac.createGain();
			this.lfoOsc.type = 'sine';
			this.lfoOsc.frequency.setValueAtTime(0.06, ac.currentTime);
			this.lfoGain.gain.setValueAtTime(50, ac.currentTime); // gentle ±50Hz modulation
			this.lfoOsc.connect(this.lfoGain);
			this.lfoGain.connect(this.filterNode.frequency);
			this.lfoOsc.start(ac.currentTime);
		} catch {}

		// Deep Spatial Delay / Warm Diffuse Echo
		this.delayNode = ac.createDelay();
		this.delayNode.delayTime.setValueAtTime(0.68, ac.currentTime);

		this.delayFeedback = ac.createGain();
		this.delayFeedback.gain.setValueAtTime(0.36, ac.currentTime);

		this.delayFilter = ac.createBiquadFilter();
		this.delayFilter.type = 'lowpass';
		this.delayFilter.frequency.setValueAtTime(800, ac.currentTime); // Darker, smoother echoes

		// Delay loop: delay -> filter -> feedback -> delay
		this.delayNode.connect(this.delayFilter);
		this.delayFilter.connect(this.delayFeedback);
		this.delayFeedback.connect(this.delayNode);

		// Send delay output smoothly to master
		const delayWet = ac.createGain();
		delayWet.gain.setValueAtTime(0.3, ac.currentTime);
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
			this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
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
		this.masterGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, target), ac.currentTime + 1.8);

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
			this.masterGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);
		}

		window.setTimeout(() => {
			this.stopLoops();
		}, 1250);

		try {
			localStorage.setItem(LS_MUSIC_PLAYING, '0');
		} catch {}
	}

	private startLoops(): void {
		const ac = this.getContext();
		if (!ac) return;

		this.buildWarmSubTone(ac);
		this.playNextChord();

		// Crossfade cycle: Every 13 seconds trigger the next chord while the previous continues smoothly
		this.chordTimer = window.setInterval(() => {
			this.playNextChord();
		}, 13000);

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

		if (this.warmNoiseSource) {
			try {
				this.warmNoiseSource.stop();
				this.warmNoiseSource.disconnect();
			} catch {}
			this.warmNoiseSource = null;
		}
	}

	private playNextChord(): void {
		const ac = this.getContext();
		if (!ac || !this.filterNode) return;

		const chord = this.chords[this.chordIndex % this.chords.length];
		this.currentChord = chord.name;
		this.chordIndex++;

		// Ultra-long smooth crossfade parameters:
		// 21s total duration with 13s trigger rate = 8s of silky harmonic overlap
		const chordDuration = 21.0;
		const attackTime = 6.5;
		const releaseTime = 7.5;

		const chordGain = ac.createGain();
		chordGain.gain.setValueAtTime(0.0001, ac.currentTime);
		// Gentle swell in
		chordGain.gain.linearRampToValueAtTime(0.12, ac.currentTime + attackTime);
		// Sustained warmth
		chordGain.gain.setValueAtTime(0.12, ac.currentTime + chordDuration - releaseTime);
		// Gentle dissolve out
		chordGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + chordDuration);

		chordGain.connect(this.filterNode);

		// Deep sub-bass root (pure sine, warm foundation)
		const subOsc = ac.createOscillator();
		const subGain = ac.createGain();
		subOsc.type = 'sine';
		subOsc.frequency.setValueAtTime(chord.root, ac.currentTime);
		subGain.gain.setValueAtTime(0.22, ac.currentTime);
		subOsc.connect(subGain);
		subGain.connect(chordGain);
		subOsc.start(ac.currentTime);
		subOsc.stop(ac.currentTime + chordDuration + 0.2);

		const voices: OscillatorNode[] = [subOsc];

		// Silky pad voices (dual detuned pure sine waves per voice for gentle chorus shimmer, zero harshness)
		for (let i = 0; i < chord.padNotes.length; i++) {
			const freq = chord.padNotes[i];

			const oscA = ac.createOscillator();
			const oscB = ac.createOscillator();

			oscA.type = 'sine';
			oscB.type = 'sine';

			oscA.frequency.setValueAtTime(freq, ac.currentTime);
			oscB.frequency.setValueAtTime(freq, ac.currentTime);

			// Gentle micro-detuning (±3 cents) for warm spatial drift
			oscA.detune.setValueAtTime(-3, ac.currentTime);
			oscB.detune.setValueAtTime(+3, ac.currentTime);

			const voiceGain = ac.createGain();
			const voiceVol = i === 0 ? 0.12 : 0.085;
			voiceGain.gain.setValueAtTime(voiceVol, ac.currentTime);

			oscA.connect(voiceGain);
			oscB.connect(voiceGain);
			voiceGain.connect(chordGain);

			oscA.start(ac.currentTime);
			oscB.start(ac.currentTime);
			oscA.stop(ac.currentTime + chordDuration + 0.2);
			oscB.stop(ac.currentTime + chordDuration + 0.2);

			voices.push(oscA, oscB);
		}

		const nodeItem = {
			stop: () => {
				try {
					chordGain.gain.cancelScheduledValues(ac.currentTime);
					chordGain.gain.setValueAtTime(Math.max(0.0001, chordGain.gain.value), ac.currentTime);
					chordGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.8);
					window.setTimeout(() => {
						for (const v of voices) {
							try {
								v.stop();
								v.disconnect();
							} catch {}
						}
						chordGain.disconnect();
					}, 850);
				} catch {}
			}
		};

		this.activeChordNodes.push(nodeItem);

		// Keep only active overlapping chords
		if (this.activeChordNodes.length > 4) {
			this.activeChordNodes.shift();
		}
	}

	private scheduleNextChime(): void {
		if (!this.isPlaying) return;
		// Sparse, calm timing: every 7 to 14 seconds
		const delay = 7000 + Math.random() * 7000;

		this.chimeTimer = window.setTimeout(() => {
			this.playChimeNote();
			this.scheduleNextChime();
		}, delay);
	}

	private playChimeNote(): void {
		const ac = this.getContext();
		if (!ac || !this.filterNode || !this.delayNode) return;

		// Pure pentatonic raindrop frequencies (C4, D4, E4, G4, A4, C5, D5, E5)
		const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
		const note = scale[Math.floor(Math.random() * scale.length)];

		// Primary soft tone (pure sine wave)
		const osc = ac.createOscillator();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(note, ac.currentTime);

		// Soft harmonic octave overtone (exactly 2x fundamental for gentle crystalline clarity)
		const overtone = ac.createOscillator();
		overtone.type = 'sine';
		overtone.frequency.setValueAtTime(note * 2, ac.currentTime);

		// Envelope: soft 0.05s attack (never clicks) followed by smooth 3.5s decay
		const noteGain = ac.createGain();
		noteGain.gain.setValueAtTime(0.0001, ac.currentTime);
		noteGain.gain.linearRampToValueAtTime(0.045 + Math.random() * 0.025, ac.currentTime + 0.05);
		noteGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 3.5);

		const overtoneGain = ac.createGain();
		overtoneGain.gain.setValueAtTime(0.008, ac.currentTime);
		overtoneGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.2);

		osc.connect(noteGain);
		overtone.connect(overtoneGain);
		overtoneGain.connect(noteGain);

		noteGain.connect(this.filterNode);
		noteGain.connect(this.delayNode);

		osc.start(ac.currentTime);
		overtone.start(ac.currentTime);
		osc.stop(ac.currentTime + 3.8);
		overtone.stop(ac.currentTime + 1.5);
	}

	private buildWarmSubTone(ac: AudioContext): void {
		// Deep ultra-warm analog room air (filtered pink noise below 220Hz at quiet floor level)
		const bufferSize = ac.sampleRate * 2.5;
		const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
		const data = buffer.getChannelData(0);
		let b0 = 0, b1 = 0, b2 = 0;

		for (let i = 0; i < bufferSize; i++) {
			const white = Math.random() * 2 - 1;
			b0 = 0.997 * b0 + white * 0.05;
			b1 = 0.985 * b1 + white * 0.08;
			b2 = 0.950 * b2 + white * 0.12;
			data[i] = (b0 + b1 + b2) * 0.015;
		}

		const noise = ac.createBufferSource();
		noise.buffer = buffer;
		noise.loop = true;

		// Steep warm lowpass to remove any harsh white/hiss frequency
		const lowpass = ac.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.setValueAtTime(220, ac.currentTime);

		this.warmNoiseGain = ac.createGain();
		this.warmNoiseGain.gain.setValueAtTime(0.004, ac.currentTime); // Whisper quiet analog glow

		noise.connect(lowpass);
		lowpass.connect(this.warmNoiseGain);
		this.warmNoiseGain.connect(this.masterGain!);

		noise.start();
		this.warmNoiseSource = noise;
	}
}

export const ambientMusic = new AmbientMusicEngine();

