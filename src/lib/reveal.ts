import { gsap, prefersReducedMotion, setupGsap } from '#lib/motion';

/**
 * Reveal-on-scroll: fades + lifts the node the first time it enters the viewport.
 * `delay` is in milliseconds so existing call sites (use:reveal={i * 70}) keep working.
 */
export function reveal(node: HTMLElement, delay = 0) {
	node.setAttribute('data-reveal', '');

	if (typeof window === 'undefined') return {};

	if (prefersReducedMotion()) {
		node.classList.add('revealed');
		return {};
	}

	setupGsap();

	const tween = gsap.fromTo(
		node,
		{ autoAlpha: 0, y: 30, scale: 0.985 },
		{
			autoAlpha: 1,
			y: 0,
			scale: 1,
			duration: 0.95,
			ease: 'power4.out',
			delay: delay / 1000,
			scrollTrigger: {
				trigger: node,
				start: 'top 88%',
				once: true
			},
			onComplete: () => node.classList.add('revealed')
		}
	);

	return {
		destroy() {
			tween.scrollTrigger?.kill();
			tween.kill();
		}
	};
}
