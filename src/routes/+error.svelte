<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Nav from '#lib/components/Nav.svelte';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import IconRadio from '@tabler/icons-svelte/icons/radio';
	import IconDisc from '@tabler/icons-svelte/icons/disc';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import IconTrophy from '@tabler/icons-svelte/icons/trophy';
	import IconBookmark from '@tabler/icons-svelte/icons/bookmark';

	import { areDoorsOpen } from '#lib/config';

	const status = $derived(page.status ?? 404);
	const message = $derived(page.error?.message || 'That page does not exist in the logbook.');
	const pathname = $derived(page.url?.pathname || '');
	const doorsOpen = $derived(areDoorsOpen());

	// Only trigger sunrise finish celebration when explicitly intended, never on a generic 404
	const isNightFinish = $derived(
		message === 'DAWN_REACHED' ||
		page.url?.searchParams?.get('dawn') === '1'
	);

	const LS_ACHIEVEMENT_SEEN = 'an.achievement_seen.sunrise_survivor';
	let isFirstTimeUnlock = $state(false);

	onMount(() => {
		if (typeof window !== 'undefined' && isNightFinish) {
			try {
				const alreadySeen = localStorage.getItem(LS_ACHIEVEMENT_SEEN);
				if (!alreadySeen) {
					isFirstTimeUnlock = true;
					localStorage.setItem(LS_ACHIEVEMENT_SEEN, 'true');
				}
			} catch {}
		}
	});
</script>

<svelte:head>
	<title>{isNightFinish ? 'Dawn Conquered · All Nighter' : `${status} · All Nighter`}</title>
</svelte:head>

<Nav />

<main class="relative flex min-h-[calc(100dvh-64px)] md:min-h-[calc(100dvh-68px)] flex-col items-center justify-center px-5 py-16 overflow-hidden">
	<!-- Subtle ambient radial grid -->
	<div
		class="pointer-events-none absolute inset-0 opacity-20"
		style={isNightFinish
			? 'background-image: radial-gradient(rgba(245, 158, 11, 0.2) 1px, transparent 1px); background-size: 24px 24px;'
			: 'background-image: radial-gradient(rgba(131, 249, 214, 0.15) 1px, transparent 1px); background-size: 24px 24px;'}
	></div>

	<div class="relative w-full max-w-lg rounded-2xl border border-cream/10 bg-gradient-to-b from-night-2 via-night-2 to-night p-8 sm:p-10 text-center shadow-2xl">
		{#if isNightFinish}
			<!-- Celebratory Sunrise Badge & Icon -->
			<div class="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-amber/40 bg-amber/15 text-amber shadow-lg shadow-amber/15 animate-in zoom-in-95 duration-200">
				<IconSun size={32} stroke={2} />
			</div>

			<!-- Status Pill -->
			<div class="inline-flex items-center gap-1.5 rounded-full border border-amber/40 bg-amber/10 px-3.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-amber">
				<span class="h-1.5 w-1.5 rounded-full bg-amber animate-pulse"></span>
				<span>Dawn Reached // 06:00 Conquered</span>
			</div>

			<h1 class="mt-4 text-2xl font-bold tracking-tight text-cream sm:text-3xl">
				You made it till <span class="text-amber">sunrise</span>!
			</h1>

			<p class="mt-2.5 text-xs sm:text-sm leading-relaxed text-taupe max-w-md mx-auto">
				While the rest of the world was asleep, you showed up, locked in, and pushed through until dawn. That is a real achievement.
			</p>

			<!-- Achievement Unlocked Card (only displayed once upon initial unlock) -->
			{#if isFirstTimeUnlock}
				<div class="mt-5 rounded-xl border border-amber/30 bg-amber/10 p-4 text-center animate-in zoom-in-95 duration-200">
					<div class="flex items-center justify-center gap-2 text-amber font-semibold text-xs tracking-wider uppercase font-mono">
						<IconTrophy size={16} stroke={2} />
						<span>Achievement Unlocked: Sunrise Survivor</span>
					</div>
					<p class="mt-1.5 text-xs text-cream/90 leading-relaxed">
						Your late-night lock-in is complete. While the rest of the world was asleep, you showed up, locked in, and pushed through until dawn.
					</p>
				</div>
			{/if}

			<!-- Action Links -->
			<div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
				<a href="/archive" class="btn btn-amber w-full sm:w-auto text-xs px-5 py-2.5 font-medium flex items-center justify-center gap-2 shadow-lg shadow-amber/15">
					<IconBookmark size={15} stroke={2} />
					<span>Explore The Logbook</span>
				</a>
				<a href="/" class="btn btn-secondary w-full sm:w-auto text-xs px-4 py-2.5 flex items-center justify-center gap-1.5">
					<IconArrowLeft size={14} stroke={2} />
					<span>Tonight's Lounge</span>
				</a>
				{#if doorsOpen}
					<a href="/room" class="btn btn-ghost w-full sm:w-auto text-xs px-4 py-2.5 flex items-center justify-center gap-1.5">
						<IconRadio size={14} stroke={1.5} />
						<span>The Room</span>
					</a>
				{/if}
			</div>
		{:else}
			<!-- Standard 404 View -->
			<div class="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-lamp/30 bg-lamp/10 text-lamp">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-7 w-7 fill-lamp" aria-hidden="true">
					<path d="M12 1.992a10 10 0 1 0 9.236 13.838c.341 -.82 -.476 -1.644 -1.298 -1.31a6.5 6.5 0 0 1 -6.864 -10.787l.077 -.08c.551 -.63 .113 -1.653 -.758 -1.653h-.266l-.068 -.006l-.06 -.002z" />
				</svg>
			</div>

			<!-- Status Code -->
			<p class="font-mono text-xs uppercase tracking-[0.2em] text-lamp font-medium">
				SIGNAL DISCONNECTED // ERROR {status}
			</p>

			<h1 class="mt-3 text-2xl font-bold tracking-tight text-cream sm:text-3xl">
				Lost in the dead of night.
			</h1>

			<p class="mt-3 text-sm leading-relaxed text-taupe">
				{message}
			</p>

			<!-- Action Links -->
			<div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
				<a href="/" class="btn btn-primary w-full sm:w-auto text-xs px-5">
					<IconArrowLeft size={14} stroke={2} />
					Back to Tonight
				</a>
				{#if doorsOpen}
					<a href="/room" class="btn btn-ghost w-full sm:w-auto text-xs px-4">
						<IconRadio size={14} stroke={1.5} />
						The Room
					</a>
				{/if}
				<a href="/archive" class="btn btn-ghost w-full sm:w-auto text-xs px-4">
					<IconDisc size={14} stroke={1.5} />
					Past Nights
				</a>
			</div>
		{/if}
	</div>
</main>
