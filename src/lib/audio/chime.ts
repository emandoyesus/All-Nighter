/**
 * Lightweight Web Audio synthesized chimes.
 * Zero external MP3 files required.
 */

let ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	try {
		const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
		if (!AudioCtx) return null;
		if (!ctx || ctx.state === 'closed') {
			ctx = new AudioCtx();
		}
		if (ctx.state === 'suspended') {
			ctx.resume().catch(() => {});
		}
		return ctx;
	} catch {
		return null;
	}
}

/** Soft chime indicating Focus mode (lock in). */
export function playFocusChime(): void {
	const ac = getAudioContext();
	if (!ac) return;

	const now = ac.currentTime;
	const freqs = [440, 659.25]; // A4 -> E5 (gentle rising interval)

	freqs.forEach((freq, idx) => {
		const osc = ac.createOscillator();
		const gain = ac.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(freq, now + idx * 0.14);

		gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
		gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.14 + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.9);

		osc.connect(gain);
		gain.connect(ac.destination);

		osc.start(now + idx * 0.14);
		osc.stop(now + idx * 0.14 + 0.95);
	});
}

/** Relaxing chime indicating Break mode (floor open). */
export function playBreakChime(): void {
	const ac = getAudioContext();
	if (!ac) return;

	const now = ac.currentTime;
	const freqs = [659.25, 523.25, 440]; // E5 -> C5 -> A4 (descending peaceful chord)

	freqs.forEach((freq, idx) => {
		const osc = ac.createOscillator();
		const gain = ac.createGain();

		osc.type = 'triangle';
		osc.frequency.setValueAtTime(freq, now + idx * 0.18);

		gain.gain.setValueAtTime(0.0001, now + idx * 0.18);
		gain.gain.exponentialRampToValueAtTime(0.1, now + idx * 0.18 + 0.03);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.18 + 1.2);

		osc.connect(gain);
		gain.connect(ac.destination);

		osc.start(now + idx * 0.18);
		osc.stop(now + idx * 0.18 + 1.25);
	});
}

/** Warm sunrise chime when dawn is reached. */
export function playDawnChime(): void {
	const ac = getAudioContext();
	if (!ac) return;

	const now = ac.currentTime;
	const freqs = [261.63, 329.63, 392.0, 523.25]; // C major sunrise chord

	freqs.forEach((freq, idx) => {
		const osc = ac.createOscillator();
		const gain = ac.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(freq, now + idx * 0.1);

		gain.gain.setValueAtTime(0.0001, now + idx * 0.1);
		gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.1 + 0.05);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 2.0);

		osc.connect(gain);
		gain.connect(ac.destination);

		osc.start(now + idx * 0.1);
		osc.stop(now + idx * 0.1 + 2.1);
	});
}
