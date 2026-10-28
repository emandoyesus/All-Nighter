<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap, prefersReducedMotion, setupGsap } from '#lib/motion';
	import { magnetic } from '#lib/magnetic';
	import { splitReveal } from '#lib/split-reveal';
	import Countdown from './Countdown.svelte';
	import TonightStrip from './TonightStrip.svelte';

	let section: HTMLElement;

	onMount(() => {
		if (prefersReducedMotion()) return;

		setupGsap();

		const ctx = gsap.context(() => {
			gsap.from('[data-hero]', {
				opacity: 0,
				y: 20,
				duration: 0.85,
				stagger: 0.08,
				ease: 'power3.out'
			});

			gsap.fromTo(
				'.hero-scroll i',
				{ scaleY: 0 },
				{
					scaleY: 1,
					duration: 1.15,
					repeat: -1,
					yoyo: true,
					ease: 'power2.inOut',
					transformOrigin: 'top'
				}
			);
		}, section);

		return () => ctx.revert();
	});
</script>

<section id="top" class="relative overflow-hidden" bind:this={section}>
	<div
		class="relative mx-auto grid max-w-[1400px] items-center gap-10 px-5 pb-16 pt-12 md:grid-cols-2 md:gap-10 md:pt-16 lg:gap-16 lg:pb-24"
	>
		<div>
			<p class="eyebrow" data-hero>Something's on tonight.</p>
			<h1
				class="mt-5 text-5xl font-semibold leading-[1.03] tracking-tight md:text-6xl"
				data-split
				use:splitReveal={{ scroll: false, delay: 0.12, stagger: 0.06, yPercent: 120 }}
			>
				Show up.<br />Lock in till sunrise.
			</h1>
			<p class="mt-5 max-w-[46ch] text-lg leading-relaxed text-taupe" data-hero>
				Work alongside each other. The music holds it together. Dawn closes the book.
			</p>
			<div class="mt-8 flex flex-wrap gap-3" data-hero>
				<a href="/room" class="btn btn-primary" use:magnetic={0.18}>Step in</a>
				<a href="/archive" class="btn btn-ghost" use:magnetic={0.18}>Browse past nights</a>
			</div>
			<div class="mt-6" data-hero>
				<TonightStrip />
			</div>
		</div>

		<div class="relative w-full">
			<Countdown size="big" />
		</div>
	</div>

	<div
		class="hero-scroll pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
		aria-hidden="true"
	>
		<span class="num text-[10px] uppercase tracking-[0.2em] text-faint">scroll</span>
		<span class="h-10 w-px overflow-hidden bg-cream/10"><i></i></span>
	</div>
</section>
