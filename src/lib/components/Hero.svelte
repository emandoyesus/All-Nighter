<script lang="ts">
	import { onMount } from 'svelte';
	import { asset } from '$app/paths';
	import { gsap, prefersReducedMotion, setupGsap } from '#lib/motion';
	import { magnetic } from '#lib/magnetic';
	import { splitReveal } from '#lib/split-reveal';
	import { tilt } from '#lib/tilt';
	import Countdown from './Countdown.svelte';
	import TonightStrip from './TonightStrip.svelte';

	let section: HTMLElement;

	onMount(() => {
		if (prefersReducedMotion()) return;

		setupGsap();

		const ctx = gsap.context(() => {
			gsap.set('[data-hero]', { opacity: 0, y: 24 });

			gsap
				.timeline({ defaults: { ease: 'power3.out' } })
				.to('[data-hero]', { opacity: 1, y: 0, duration: 0.95, stagger: 0.085 }, 0.08)
				.fromTo(
					'[data-media-clip]',
					{ clipPath: 'inset(14% 8% 14% 8% round 14px)' },
					{ clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 1.25, ease: 'power4.out' },
					0.16
				)
				.fromTo(
					'[data-hero-media] img',
					{ scale: 1.16 },
					{ scale: 1, duration: 1.4, ease: 'power4.out' },
					0.16
				);

			gsap.fromTo(
				'[data-hero-media] img',
				{ yPercent: -3 },
				{
					yPercent: 3,
					ease: 'none',
					scrollTrigger: {
						trigger: '[data-hero-media]',
						start: 'top top',
						end: 'bottom top',
						scrub: true
					}
				}
			);

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
		class="relative mx-auto grid max-w-[1400px] items-center gap-10 px-5 pb-16 pt-12 md:grid-cols-[1.15fr_0.85fr] md:gap-8 md:pt-16 lg:grid-cols-[1.2fr_0.8fr] lg:gap-14 lg:pb-24"
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
			<div class="mt-6 max-w-sm" data-hero>
				<Countdown />
			</div>
			<div class="mt-5" data-hero>
				<TonightStrip />
			</div>
		</div>

		<figure class="relative" data-hero data-hero-media use:tilt={3}>
			<div class="overflow-hidden rounded-card ring-1 ring-cream/10">
				<div data-media-clip>
					<img
						src={asset('nights/hero.jpg')}
						alt="A quiet late-night desk illuminated by an amber lamp with a laptop, headphones, coffee, and a rainy window"
						width="1000"
						height="1250"
						class="photo-warm aspect-[4/5] w-full object-cover md:max-h-[58vh] lg:max-h-[66vh]"
					/>
				</div>
			</div>
			<div
				class="pointer-events-none absolute inset-0 rounded-card bg-gradient-to-t from-night/85 via-night/30 to-transparent"
				aria-hidden="true"
			></div>
		</figure>
	</div>

	<div
		class="hero-scroll pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
		aria-hidden="true"
	>
		<span class="num text-[10px] uppercase tracking-[0.2em] text-faint">scroll</span>
		<span class="h-10 w-px overflow-hidden bg-cream/10"><i></i></span>
	</div>
</section>
