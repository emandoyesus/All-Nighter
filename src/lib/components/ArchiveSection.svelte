<script lang="ts">
	import { asset } from '$app/paths';
	import { nights } from '#lib/data/archive';
	import { reveal } from '#lib/reveal';
	import { splitReveal } from '#lib/split-reveal';
	import { tilt } from '#lib/tilt';
	import IconChevronRight from '@tabler/icons-svelte/icons/chevron-right';
</script>

<section id="archive" class="border-t border-cream/10 bg-night-2">
	<div class="mx-auto max-w-[1400px] px-5 py-16 md:py-24">
		<p class="eyebrow">{nights.length} nights on record</p>
		<h2 class="mt-4 text-3xl font-semibold tracking-tight md:text-4xl" data-split use:splitReveal>
			The archive
		</h2>
		<p class="mt-3 max-w-[52ch] text-sm leading-relaxed text-taupe">
			Every session gets a page. The tracklist, who was there, what everyone was working on, and the
			line that the room decided to screenshot.
		</p>

		<div class="rail mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5">
			{#each nights as night, i (night.seed)}
				<a
					href="/archive/{night.slug}"
					class="group w-[82vw] max-w-[400px] shrink-0 snap-start overflow-hidden rounded-card bg-night ring-1 ring-cream/10 transition-colors hover:ring-lamp/40 sm:w-[60vw] lg:w-[380px]"
					data-reveal
					use:reveal={i * 70}
					use:tilt={3}
				>
					<div class="relative overflow-hidden">
						<img
							src={asset(night.img)}
							alt=""
							width="800"
							height="500"
							loading="lazy"
							class="photo-warm aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
						/>
						<!-- zine-style tag chip -->
						<span class="num absolute left-3 top-3 rounded-full bg-night/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-lamp backdrop-blur">
							{night.tag}
						</span>
					</div>
					<div class="p-5">
						<div class="num flex items-center justify-between gap-3 text-xs text-faint">
							<span>{night.date}</span>
							<span class="truncate text-right">{night.hours} · {night.tracks} tracks</span>
						</div>
						<h3 class="mt-2.5 text-lg font-medium leading-snug">{night.title}</h3>

						<!-- best chat moment as a zine pull-quote -->
						{#if night.chatMoments[0]}
							<p class="zine-quote mt-3 line-clamp-2">{night.chatMoments[0].text}</p>
							<p class="num mt-1 text-[10px] text-faint">— {night.chatMoments[0].who} · {night.chatMoments[0].at}</p>
						{/if}

						<div class="num mt-4 flex items-center gap-1 text-xs text-taupe transition-colors group-hover:text-lamp">
							<span>Read the night</span>
							<IconChevronRight size={13} stroke={1.5} />
						</div>
					</div>
				</a>
			{/each}
		</div>

		<a href="/archive" class="btn btn-ghost btn-sm mt-2">
			All nights
			<IconChevronRight size={14} stroke={1.5} />
		</a>
	</div>
</section>
