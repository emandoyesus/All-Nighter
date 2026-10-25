import { gsap, hasFinePointer, prefersReducedMotion, setupGsap } from '#lib/motion';

/** Pulls a control toward the pointer while it is hovered. */
export function magnetic(node: HTMLElement, strength = 0.18) {
	if (typeof window === 'undefined' || prefersReducedMotion() || !hasFinePointer()) return {};

	setupGsap();

	const xTo = gsap.quickTo(node, 'x', { duration: 0.5, ease: 'power3' });
	const yTo = gsap.quickTo(node, 'y', { duration: 0.5, ease: 'power3' });

	const move = (event: PointerEvent) => {
		const rect = node.getBoundingClientRect();
		xTo((event.clientX - (rect.left + rect.width / 2)) * strength);
		yTo((event.clientY - (rect.top + rect.height / 2)) * strength);
	};

	const leave = () => {
		xTo(0);
		yTo(0);
		gsap.to(node, { scale: 1, duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
	};

	const down = () => gsap.to(node, { scale: 0.97, duration: 0.15, ease: 'power2.out' });
	const up = () => gsap.to(node, { scale: 1, duration: 0.25, ease: 'power2.out' });

	node.addEventListener('pointermove', move);
	node.addEventListener('pointerleave', leave);
	node.addEventListener('pointerdown', down);
	node.addEventListener('pointerup', up);

	return {
		destroy() {
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', leave);
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointerup', up);
		}
	};
}
