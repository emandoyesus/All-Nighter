<script lang="ts">
	import { asset } from '$app/paths';
	import Nav from '#lib/components/Nav.svelte';
	import { nights } from '#lib/data/archive';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
</script>

<svelte:head>
	<title>Archive · All Nighter</title>
</svelte:head>

<Nav />

<main>
	<section class="border-b border-cream/10 bg-night-2">
		<div class="mx-auto max-w-[1400px] px-5 py-10 md:py-12">
			<a href="/" class="inline-flex items-center gap-1.5 text-sm text-taupe transition-colors hover:text-cream">
				<IconArrowLeft size={15} stroke={1.5} />
				Back to home
			</a>
			<h1 class="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Previous all-nighters</h1>
			<p class="mt-2 max-w-[58ch] leading-relaxed text-taupe">
				The nights we made it to sunrise, logged for the crew.
			</p>
		</div>
	</section>

	<section class="mx-auto max-w-[1400px] px-5 py-10 md:py-14">
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each nights as night (night.seed)}
				<article class="flex h-full flex-col overflow-hidden rounded-card bg-night ring-1 ring-cream/10">
					<img
						src={asset(night.img)}
						alt=""
						width="800"
						height="500"
						loading="lazy"
						class="photo-warm aspect-[16/10] w-full object-cover"
					/>
					<div class="flex flex-1 flex-col p-5">
						<div class="num flex items-center justify-between gap-3 text-xs text-faint">
							<span>{night.date}</span>
							<span class="truncate text-right">{night.tag}</span>
						</div>
						<h3 class="mt-2.5 text-lg font-medium leading-snug">{night.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-taupe">{night.note}</p>
						<div class="num mt-auto flex gap-4 pt-4 text-xs text-faint">
							<span>{night.hours}</span>
							<span>{night.tracks} tracks</span>
							<span>{night.heads} awake</span>
						</div>
					</div>
				</article>
			{/each}
		</div>
</section>
</main>

<footer class="border-t border-cream/10">
	<div class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-7">
		<p class="num text-xs text-faint">All Nighter · built between 1 and 6 am</p>
		<p class="num text-xs text-faint">keep the tab open</p>
	</div>
</footer>
