import { gsap, prefersReducedMotion, setupGsap } from '#lib/motion';

/** Scroll-scrubbed vertical drift for images inside clipped media frames. */
export function parallax(node: HTMLElement, strength = 10) {
	if (typeof window === 'undefined' || prefersReducedMotion()) return {};

	setupGsap();
	gsap.set(node, { scale: 1.12 });

	const tween = gsap.fromTo(
		node,
		{ yPercent: -strength / 2 },
		{
			yPercent: strength / 2,
			ease: 'none',
			scrollTrigger: {
				trigger: node.parentElement ?? node,
				start: 'top bottom',
				end: 'bottom top',
				scrub: true
			}
		}
	);

	return {
		destroy() {
			tween.scrollTrigger?.kill();
			tween.kill();
		}
	};
}
