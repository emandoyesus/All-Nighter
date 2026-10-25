<script lang="ts">
	import { asset } from '$app/paths';
	import { reveal } from '#lib/reveal';
	import { splitReveal } from '#lib/split-reveal';
	import { parallax } from '#lib/parallax';
	import IconTarget from '@tabler/icons-svelte/icons/target';
	import IconWaveSine from '@tabler/icons-svelte/icons/wave-sine';
	import IconSunrise from '@tabler/icons-svelte/icons/sunrise';
</script>

<section id="nights" class="mx-auto max-w-[1400px] px-5 py-16 md:py-24">
	<p class="eyebrow">How a night runs</p>
	<h2
		class="mt-4 max-w-[22ch] text-3xl font-semibold tracking-tight md:text-4xl"
		data-split
		use:splitReveal
	>
		Two modes. One night. Music holds it together.
	</h2>

	<div class="mt-10 grid gap-4 md:grid-cols-5">
		<!-- Focus mode card -->
		<article
			class="relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-card ring-1 ring-cream/10 md:col-span-3"
			data-reveal
			use:reveal
		>
			<img
				src={asset('nights/ritual.jpg')}
				alt="A dim room lit by a laptop screen during a late-night session"
				width="1200"
				height="800"
				loading="lazy"
				class="photo-warm absolute inset-0 h-full w-full object-cover"
				use:parallax={10}
			/>
			<div
				class="absolute inset-0 bg-gradient-to-t from-night via-night/60 to-night/10"
				aria-hidden="true"
			></div>
			<div class="relative flex h-full flex-col justify-end p-6 md:p-7">
				<span class="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-lamp/40 bg-lamp/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lamp">
					<IconTarget size={11} stroke={2} />
					Focus mode
				</span>
				<h3 class="text-xl font-medium">We go quiet for fifty.</h3>
				<p class="mt-2 max-w-[46ch] text-sm leading-relaxed text-taupe">
					Chat mutes. The queue favors calm. You can still see who's in the room — that shared
					presence is the whole point. Post one line: what you're working on tonight.
				</p>
			</div>
		</article>

		<!-- Break mode card -->
		<article
			class="flex min-h-[240px] flex-col justify-end rounded-card p-6 ring-1 ring-cream/10 md:col-span-2 md:p-7"
			style="background: linear-gradient(160deg, color-mix(in srgb, var(--color-amber) 12%, var(--color-night-3)) 0%, var(--color-night-2) 100%)"
			data-reveal
			use:reveal={80}
		>
			<span class="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-amber/40 bg-amber/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-200"
				style="--tw-text-opacity:1; color: var(--color-amber)"
			>
				<IconWaveSine size={11} stroke={2} />
				Break mode
			</span>
			<h3 class="text-xl font-semibold text-cream">Then the floor opens.</h3>
			<p class="mt-2 max-w-[38ch] text-sm leading-relaxed text-cream/70">
				Chat comes back. Anyone can add to the queue. Dedicate a track. Ten minutes, then we lock
				back in.
			</p>
		</article>

		<!-- Dawn card -->
		<article
			class="rounded-card bg-night-2 p-6 ring-1 ring-cream/10 md:col-span-5 md:flex md:items-center md:justify-between md:gap-8 md:p-7"
			data-reveal
			use:reveal={140}
		>
			<div class="max-w-[58ch]">
				<span class="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-cream/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-taupe">
					<IconSunrise size={11} stroke={2} />
					Dawn ritual
				</span>
				<h3 class="text-xl font-medium">Dawn closes the book.</h3>
				<p class="mt-2 text-sm leading-relaxed text-taupe">
					When the room closes, a page gets written: the tracklist, who was there, what everyone
					worked on, and the moments that got screenshotted. Kept in the archive, forever.
				</p>
			</div>
			<p class="num mt-4 shrink-0 text-xs text-faint md:mt-0">4 nights on record</p>
		</article>
	</div>
</section>
