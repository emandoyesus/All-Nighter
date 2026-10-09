<script lang="ts">
	import { asset } from '$app/paths';
	import { nights } from '#lib/data/archive';
	import { reveal } from '#lib/reveal';
</script>

<section id="archive" class="border-t border-cream/10 bg-night-2">
	<div class="mx-auto max-w-[1400px] px-5 py-16 md:py-24">
		<div use:reveal>
			<h2 class="text-3xl font-semibold tracking-tight md:text-4xl">Previous all-nighters</h2>
		</div>

		<div class="rail mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5">
			{#each nights as night, i (night.seed)}
				<article
					class="w-[82vw] max-w-[400px] shrink-0 snap-start overflow-hidden rounded-card bg-night ring-1 ring-cream/10 sm:w-[60vw] lg:w-[380px]"
					use:reveal={i * 70}
				>
					<img
						src={asset(night.img)}
						alt=""
						width="800"
						height="500"
						loading="lazy"
						class="photo-warm aspect-[16/10] w-full object-cover"
					/>
					<div class="p-5">
						<div class="num flex items-center justify-between gap-3 text-xs text-faint">
							<span>{night.date}</span>
							<span class="truncate text-right">{night.tag}</span>
						</div>
						<h3 class="mt-2.5 text-lg font-medium leading-snug">{night.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-taupe">{night.note}</p>
						<div class="num mt-4 flex gap-4 text-xs text-faint">
							<span>{night.hours}</span>
							<span>{night.tracks} tracks</span>
							<span>{night.heads} awake</span>
						</div>
					</div>
				</article>
			{/each}
		</div>
	</div>
</section>
