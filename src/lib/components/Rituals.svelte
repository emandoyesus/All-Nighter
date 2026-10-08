<script lang="ts">
	import { asset } from '$app/paths';
	import { reveal } from '#lib/reveal';
</script>

<section id="nights" class="mx-auto max-w-[1400px] px-5 py-16 md:py-24">
	<div use:reveal>
		<h2 class="max-w-[18ch] text-3xl font-semibold tracking-tight md:text-4xl">
			How a night runs
		</h2>
	</div>

	<div class="mt-10 grid gap-4 md:grid-cols-5">
		<article
			class="relative min-h-[300px] overflow-hidden rounded-card ring-1 ring-cream/10 md:col-span-3"
			use:reveal
		>
			<!-- Swap for a photo of your actual setup -->
<img
					src={asset('nights/ritual.jpg')}
					alt="A dim room lit by a laptop screen during a late-night session"
					width="1200"
					height="800"
				loading="lazy"
				class="photo-warm absolute inset-0 h-full w-full object-cover"
			/>
			<div
				class="absolute inset-0 bg-gradient-to-t from-night via-night/60 to-night/10"
				aria-hidden="true"
			></div>
			<div class="relative flex h-full flex-col justify-end p-6 md:p-7">
				<h3 class="text-xl font-medium">Doors open at eleven</h3>
				<p class="mt-2 max-w-[46ch] text-sm leading-relaxed text-taupe">
					Someone starts a room, drops the link in Telegram, and the countdown to dawn begins.
				</p>
			</div>
		</article>

		<article
			class="flex min-h-[240px] flex-col justify-end rounded-card bg-lamp p-6 text-night md:col-span-2 md:p-7"
			use:reveal={80}
		>
			<h3 class="text-xl font-semibold">Everyone has the aux</h3>
			<p class="mt-2 max-w-[38ch] text-sm leading-relaxed text-night/75">
				Paste any YouTube track into the queue. Pause or skip, and it changes for everyone,
				mid-song.
			</p>
		</article>

		<article
			class="rounded-card bg-night-2 p-6 ring-1 ring-cream/10 md:col-span-5 md:flex md:items-center md:justify-between md:gap-8 md:p-7"
			use:reveal={140}
		>
			<div class="max-w-[58ch]">
				<h3 class="text-xl font-medium">Sunrise gets logged</h3>
				<p class="mt-2 text-sm leading-relaxed text-taupe">
					Tracks, screenshots, who fell asleep first. The archive remembers every night we made
					it to morning.
				</p>
			</div>
			<p class="num mt-4 shrink-0 text-xs text-faint md:mt-0">4 nights on record</p>
		</article>
	</div>
</section>
