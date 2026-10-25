import { gsap, hasFinePointer, prefersReducedMotion, setupGsap } from '#lib/motion';

/** Subtle 3D tilt that follows the pointer across a card or image. */
export function tilt(node: HTMLElement, max = 4) {
	if (typeof window === 'undefined' || prefersReducedMotion() || !hasFinePointer()) return {};

	setupGsap();

	gsap.set(node, { transformPerspective: 900, transformOrigin: 'center' });

	const rotateX = gsap.quickTo(node, 'rotationX', { duration: 0.55, ease: 'power3' });
	const rotateY = gsap.quickTo(node, 'rotationY', { duration: 0.55, ease: 'power3' });

	const move = (event: PointerEvent) => {
		const rect = node.getBoundingClientRect();
		const x = (event.clientX - rect.left) / rect.width - 0.5;
		const y = (event.clientY - rect.top) / rect.height - 0.5;
		rotateY(x * max * 2);
		rotateX(-y * max * 2);
	};

	const leave = () => {
		rotateX(0);
		rotateY(0);
	};

	node.addEventListener('pointermove', move);
	node.addEventListener('pointerleave', leave);

	return {
		destroy() {
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', leave);
		}
	};
}
