import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

let ready = false;

/** Register GSAP plugins once, in the browser only. */
export function setupGsap(): void {
	if (ready || typeof window === 'undefined') return;

	gsap.registerPlugin(ScrollTrigger, SplitText);
	gsap.defaults({ ease: 'power3.out' });
	ready = true;

	const refresh = () => ScrollTrigger.refresh();

	window.addEventListener('load', refresh, { once: true });
	document.fonts?.ready.then(refresh).catch(() => {});
}

export function prefersReducedMotion(): boolean {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function hasFinePointer(): boolean {
	return typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
}

/** Matches the easing used across reveals and the hero intro. */
export const EASE_OUT = 'power3.out';

export { gsap, ScrollTrigger, SplitText };
