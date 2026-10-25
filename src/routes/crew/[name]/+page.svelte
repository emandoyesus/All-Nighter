<script lang="ts">
	import { asset } from '$app/paths';
	import Nav from '#lib/components/Nav.svelte';
	import { countUp } from '#lib/count-up';
	import { reveal } from '#lib/reveal';
	import { splitReveal } from '#lib/split-reveal';
	import type { PageData } from './$types';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconMicrophone from '@tabler/icons-svelte/icons/microphone-2';
	import IconFlame from '@tabler/icons-svelte/icons/flame';
	import IconChevronRight from '@tabler/icons-svelte/icons/chevron-right';

	let { data }: { data: PageData } = $props();
	const profile = $derived(data.profile);
</script>

<svelte:head>
	<title>{profile.name} · Crew · All Nighter</title>
</svelte:head>

<Nav />

<main>
	<section class="border-b border-cream/10 bg-night-2">
		<div class="mx-auto max-w-[1400px] px-5 py-10 md:py-12">
			<a href="/archive" class="inline-flex items-center gap-1.5 text-sm text-taupe transition-colors hover:text-cream">
				<IconArrowLeft size={15} stroke={1.5} />
				All nights
			</a>
			<div class="mt-6 flex flex-wrap items-center gap-4">
				<span class="grid h-16 w-16 place-items-center rounded-full bg-lamp/15 text-2xl font-semibold text-lamp ring-1 ring-lamp/30">
					{profile.name.charAt(0).toUpperCase()}
				</span>
				<div>
					<p class="num text-[11px] uppercase tracking-[0.14em] text-faint">crew profile</p>
					<h1
						class="mt-1 text-3xl font-semibold tracking-tight md:text-4xl"
						data-split
						use:splitReveal={{ scroll: false, delay: 0.05 }}
					>
						{profile.name}
					</h1>
					<p class="num mt-1 text-sm text-taupe">
						{profile.allNighters} all-nighter{profile.allNighters === 1 ? '' : 's'} ·
						{profile.contributions.length} track{profile.contributions.length === 1 ? '' : 's'} contributed
					</p>
				</div>
			</div>
		</div>
	</section>

	<section class="mx-auto max-w-[1400px] px-5 py-8 md:py-10">
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<div class="panel p-4" data-reveal use:reveal={0}>
				<p class="flex items-center gap-1.5 text-xs text-faint">
					<IconMoon size={14} stroke={1.5} />
					All-nighter count
				</p>
				<p class="num mt-2 text-2xl font-semibold text-cream" use:countUp={profile.allNighters}>
					{profile.allNighters}
				</p>
			</div>
			<div class="panel p-4" data-reveal use:reveal={55}>
				<p class="flex items-center gap-1.5 text-xs text-faint">
					<IconMusic size={14} stroke={1.5} />
					Picks played
				</p>
				<p class="num mt-2 text-2xl font-semibold text-cream" use:countUp={profile.contributions.length}>
					{profile.contributions.length}
				</p>
			</div>
			<div class="panel p-4" data-reveal use:reveal={110}>
				<p class="flex items-center gap-1.5 text-xs text-faint">
					<IconMicrophone size={14} stroke={1.5} />
					Most-added artist
				</p>
				<p class="mt-2 truncate text-lg font-semibold leading-tight text-cream">{profile.topArtist}</p>
			</div>
			<div class="panel p-4" data-reveal use:reveal={165}>
				<p class="flex items-center gap-1.5 text-xs text-faint">
					<IconFlame size={14} stroke={1.5} />
					Home genre
				</p>
				<p class="mt-2 truncate text-lg font-semibold leading-tight text-cream">{profile.topGenre}</p>
			</div>
		</div>

		<div class="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
			<div class="panel overflow-hidden" data-reveal use:reveal={60}>
				<div class="border-b border-cream/10 px-5 py-4">
					<h2 class="text-lg font-medium">Nights attended</h2>
				</div>
				<ul class="divide-y divide-cream/8">
					{#each profile.nights as night (night.slug)}
						<li>
							<a href="/archive/{night.slug}" class="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-night/60">
								<img
									src={asset(night.img)}
									alt=""
									width="80"
									height="50"
									loading="lazy"
									class="photo-warm h-10 w-16 shrink-0 rounded object-cover"
								/>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm">{night.title}</p>
									<p class="num mt-0.5 text-xs text-faint">{night.date} · {night.tag}</p>
								</div>
								<IconChevronRight size={14} stroke={1.5} class="shrink-0 text-faint transition-colors group-hover:text-lamp" />
							</a>
						</li>
					{/each}
				</ul>
			</div>

			<div class="panel overflow-hidden" data-reveal use:reveal={120}>
				<div class="flex items-baseline justify-between border-b border-cream/10 px-5 py-4">
					<h2 class="text-lg font-medium">Contributions</h2>
					<span class="num text-xs text-faint">{profile.contributions.length}</span>
				</div>
				<ul class="divide-y divide-cream/8">
					{#each profile.contributions as track, i (track.title + i)}
						<li class="flex items-center gap-3 px-5 py-3">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm">{track.title}</p>
								<p class="truncate text-xs text-faint">
									{track.artist}
									<span class="text-faint/70">·</span>
									{track.genre}
								</p>
							</div>
							<span class="num flex w-10 shrink-0 items-center justify-end gap-1 text-xs text-faint">
								<IconFlame size={12} stroke={1.5} class={track.reactions ? 'text-lamp' : ''} />
								{track.reactions ?? 0}
							</span>
						</li>
					{:else}
						<li class="px-5 py-6 text-sm text-taupe">Joined nights, but never grabbed the aux.</li>
					{/each}
				</ul>
			</div>
		</div>

		{#if profile.favorite}
			<div class="panel mt-4 flex flex-wrap items-center gap-3 p-5">
				<span class="grid h-10 w-10 place-items-center rounded-full bg-lamp/12 text-lamp">
					<IconFlame size={18} stroke={1.5} />
				</span>
				<div class="min-w-0 flex-1">
					<p class="num text-[10px] uppercase tracking-[0.14em] text-faint">signature pick</p>
					<p class="mt-1 truncate text-sm font-medium">{profile.favorite.title}</p>
					<p class="truncate text-xs text-faint">
						{profile.favorite.artist} · {profile.favorite.reactions ?? 0} reactions
					</p>
				</div>
				<a href="/archive/{profile.nights[0].slug}" class="btn btn-ghost btn-sm">Hear the night</a>
			</div>
		{/if}
	</section>
</main>

<footer class="border-t border-cream/10">
	<div class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-7">
		<p class="num text-xs text-faint">All Nighter · built between 1 and 6 am</p>
		<p class="num text-xs text-faint">keep the tab open</p>
	</div>
</footer>
