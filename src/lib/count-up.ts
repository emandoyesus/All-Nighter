import { gsap, prefersReducedMotion, setupGsap } from '#lib/motion';

/** Counts a number up from zero the first time it enters the viewport. */
export function countUp(node: HTMLElement, value: number) {
	if (typeof window === 'undefined' || prefersReducedMotion()) return {};

	setupGsap();

	const decimals = Number.isInteger(value) ? 0 : (String(value).split('.')[1]?.length ?? 0);
	const counter = { value: 0 };

	const tween = gsap.to(counter, {
		value,
		duration: 1.4,
		ease: 'power3.out',
		scrollTrigger: { trigger: node, start: 'top 92%', once: true },
		onUpdate: () => {
			node.textContent = counter.value.toFixed(decimals);
		},
		onComplete: () => {
			node.textContent = value.toFixed(decimals);
		}
	});

	return {
		destroy() {
			tween.scrollTrigger?.kill();
			tween.kill();
		}
	};
}
