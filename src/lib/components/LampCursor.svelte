<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap, hasFinePointer, prefersReducedMotion, setupGsap } from '#lib/motion';

	let root: HTMLElement;
	let glow: HTMLElement;
	let dot: HTMLElement;

	onMount(() => {
		if (prefersReducedMotion() || !hasFinePointer()) return;

		setupGsap();

		const glowX = gsap.quickTo(glow, 'x', { duration: 0.9, ease: 'power3' });
		const glowY = gsap.quickTo(glow, 'y', { duration: 0.9, ease: 'power3' });
		const dotX = gsap.quickTo(dot, 'x', { duration: 0.16, ease: 'power3' });
		const dotY = gsap.quickTo(dot, 'y', { duration: 0.16, ease: 'power3' });

		let shown = false;

		const move = (event: PointerEvent) => {
			if (!shown) {
				shown = true;
				gsap.set([glow, dot], { x: event.clientX, y: event.clientY });
				gsap.to(root, { opacity: 1, duration: 0.5, ease: 'power2.out' });
			}

			glowX(event.clientX);
			glowY(event.clientY);
			dotX(event.clientX);
			dotY(event.clientY);
		};

		const hide = () => gsap.to(root, { opacity: 0, duration: 0.3 });
		const show = () => {
			if (shown) gsap.to(root, { opacity: 1, duration: 0.3 });
		};

		window.addEventListener('pointermove', move, { passive: true });
		window.addEventListener('pointerdown', hide);
		window.addEventListener('pointerup', show);

		return () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerdown', hide);
			window.removeEventListener('pointerup', show);
		};
	});
</script>

<div class="lamp-cursor" aria-hidden="true" bind:this={root}>
	<div class="lamp-cursor__glow" bind:this={glow}></div>
	<div class="lamp-cursor__dot" bind:this={dot}></div>
</div>
