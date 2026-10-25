<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap, prefersReducedMotion, setupGsap } from '#lib/motion';

	let {
		items,
		duration = 34,
		reverse = false
	}: { items: string[]; duration?: number; reverse?: boolean } = $props();

	let root: HTMLElement;
	let track: HTMLElement;

	onMount(() => {
		if (prefersReducedMotion()) return;

		setupGsap();

		const tween = reverse
			? gsap.fromTo(track, { xPercent: -50 }, { xPercent: 0, duration, ease: 'none', repeat: -1 })
			: gsap.to(track, { xPercent: -50, duration, ease: 'none', repeat: -1 });

		const slow = () => gsap.to(tween, { timeScale: 0.25, duration: 0.5 });
		const resume = () => gsap.to(tween, { timeScale: 1, duration: 0.5 });

		root.addEventListener('pointerenter', slow);
		root.addEventListener('pointerleave', resume);

		return () => {
			root.removeEventListener('pointerenter', slow);
			root.removeEventListener('pointerleave', resume);
			tween.kill();
		};
	});
</script>

<div class="marquee" aria-hidden="true" bind:this={root}>
	<div class="marquee__track" bind:this={track}>
		{#each [0, 1] as copy (copy)}
			<div class="marquee__group">
				{#each items as item, i (copy + '-' + i)}
					<span class="marquee__item">{item}</span>
					<span class="marquee__sep">·</span>
				{/each}
			</div>
		{/each}
	</div>
</div>
