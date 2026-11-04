<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { room } from '#lib/room/room.svelte';
	import { siteAudio } from '#lib/audio/site-audio.svelte';
	import { gsap, prefersReducedMotion, setupGsap } from '#lib/motion';
	import { magnetic } from '#lib/magnetic';
	import { ambientMusic } from '#lib/audio/ambient-music.svelte';
	import IconVolumeOff from '@tabler/icons-svelte/icons/volume-off';
	import AuthModal from './AuthModal.svelte';

	const pathname = $derived(page.url.pathname);
	const isHome = $derived(pathname === '/');
	const isRoom = $derived(pathname.startsWith('/room'));
	const isArchive = $derived(pathname.startsWith('/archive'));

	const live = $derived(room.state.playing);
	const inRoom = $derived(room.joinState === 'approved');
	const roomLink = $derived(room.room ? `/room?room=${room.room}` : '/room');

	let header: HTMLElement;
	let lastY = 0;
	let hidden = false;

	onMount(() => {
		// Stop any legacy procedural audio
		ambientMusic.pause();

		if (prefersReducedMotion()) return;

		setupGsap();
		lastY = window.scrollY;

		const onScroll = () => {
			const y = window.scrollY;

			const goingDown = y > lastY && y > 140;

			if (goingDown !== hidden) {
				hidden = goingDown;
				gsap.to(header, {
					yPercent: hidden ? -100 : 0,
					duration: 0.42,
					ease: 'power3.out',
					overwrite: true
				});
			}

			lastY = y;
		};

		window.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', onScroll);
		};
	});

	function toggleSound(): void {
		siteAudio.toggle();
	}
</script>

<header
	bind:this={header}
	class="sticky top-0 z-50 border-b border-cream/10 bg-[#060a0b]/85 backdrop-blur-xl supports-[backdrop-filter]:bg-[#060a0b]/75 transition-colors"
>
	<!-- Ambient top glowing hairline -->
	<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lamp/35 to-transparent"></div>

	<div class="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6 md:h-[68px]">
		<!-- Left: Brand Logo & Title -->
		<a
			href="/"
			class="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-95"
			aria-label="All Nighter Home"
		>
			<!-- Standalone Moon Crescent Icon matching favicon -->
			<div class="relative grid h-8 w-8 place-items-center rounded-lg border border-lamp/30 bg-lamp/10 text-lamp transition-all duration-300 group-hover:border-lamp/60 group-hover:bg-lamp/15 group-hover:shadow-[0_0_14px_rgba(131,249,214,0.25)]">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					class="h-4.5 w-4.5 fill-lamp transition-transform duration-300 group-hover:-rotate-12"
					aria-hidden="true"
				>
					<path
						d="M12 1.992a10 10 0 1 0 9.236 13.838c.341 -.82 -.476 -1.644 -1.298 -1.31a6.5 6.5 0 0 1 -6.864 -10.787l.077 -.08c.551 -.63 .113 -1.653 -.758 -1.653h-.266l-.068 -.006l-.06 -.002z"
					/>
				</svg>
			</div>
			<div class="flex items-baseline gap-2">
				<span class="text-base font-semibold tracking-tight text-cream transition-colors group-hover:text-white">
					All Nighter
				</span>
				<span class="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-lamp/80 lg:inline-block">
					00:00–06:00
				</span>
			</div>
		</a>

		<!-- Center: Segmented Navigation Capsule -->
		<nav
			class="flex items-center rounded-full border border-cream/10 bg-night-2/90 p-1 shadow-[0_2px_12px_rgba(0,0,0,0.4)] backdrop-blur-md"
			aria-label="Main navigation"
		>
			<a
				href="/"
				class="relative inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-3.5 py-1 text-xs font-medium transition-all {isHome
					? 'bg-lamp/15 text-lamp border border-lamp/35 shadow-[0_0_12px_rgba(131,249,214,0.15)]'
					: 'text-taupe hover:bg-cream/5 hover:text-cream'}"
				aria-current={isHome ? 'page' : undefined}
			>
				{#if isHome}
					<span class="h-1.5 w-1.5 rounded-full bg-lamp shadow-[0_0_6px_#83f9d6]"></span>
				{/if}
				Tonight
			</a>

			<a
				href={roomLink}
				class="relative inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-3.5 py-1 text-xs font-medium transition-all {isRoom
					? 'bg-lamp/15 text-lamp border border-lamp/35 shadow-[0_0_12px_rgba(131,249,214,0.15)]'
					: 'text-taupe hover:bg-cream/5 hover:text-cream'}"
				aria-current={isRoom ? 'page' : undefined}
			>
				{#if inRoom}
					<span class="soft-blink h-1.5 w-1.5 rounded-full bg-amber shadow-[0_0_6px_#ffb84d]"></span>
					<span class="truncate max-w-[90px] sm:max-w-[130px]">{room.title || 'In Room'}</span>
				{:else if live}
					<span class="soft-blink h-1.5 w-1.5 rounded-full bg-ruby shadow-[0_0_6px_#ff334b]"></span>
					<span>The Room</span>
					<span class="hidden sm:inline-block rounded bg-ruby/20 px-1 py-0.2 font-mono text-[9px] uppercase tracking-wider text-rose-300 border border-ruby/30">
						LIVE
					</span>
				{:else}
					{#if isRoom}
						<span class="h-1.5 w-1.5 rounded-full bg-lamp shadow-[0_0_6px_#83f9d6]"></span>
					{/if}
					The Room
				{/if}
			</a>

			<a
				href="/archive"
				class="relative inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-3.5 py-1 text-xs font-medium transition-all {isArchive
					? 'bg-lamp/15 text-lamp border border-lamp/35 shadow-[0_0_12px_rgba(131,249,214,0.15)]'
					: 'text-taupe hover:bg-cream/5 hover:text-cream'}"
				aria-current={isArchive ? 'page' : undefined}
			>
				{#if isArchive}
					<span class="h-1.5 w-1.5 rounded-full bg-lamp shadow-[0_0_6px_#83f9d6]"></span>
				{/if}
				The Archive
			</a>
		</nav>

		<!-- Right: Audio Controller, Contextual Action & Auth Profile -->
		<div class="flex items-center gap-2 sm:gap-3">
			<!-- Website Sound Quick Toggle with Equalizer Visualizer -->
			<button
				class="inline-flex items-center gap-1.5 rounded-full border px-2.5 sm:px-3 py-1.5 text-xs font-mono transition-all {siteAudio.isPlaying
					? 'border-lamp/40 bg-lamp/10 text-lamp hover:bg-lamp/15 shadow-[0_0_10px_rgba(131,249,214,0.12)]'
					: 'border-cream/12 bg-night-2/80 text-faint hover:border-cream/25 hover:text-cream'}"
				onclick={toggleSound}
				title={siteAudio.isPlaying ? 'Mute atmospheric ambient soundtrack' : 'Play atmospheric ambient soundtrack'}
				aria-label={siteAudio.isPlaying ? 'Mute soundtrack' : 'Play soundtrack'}
			>
				{#if siteAudio.isPlaying}
					<span class="inline-flex items-end gap-[2px] h-3 w-3" aria-hidden="true">
						<span class="eq-bar w-[2px] h-full bg-lamp rounded-full" style="animation-delay: 0s;"></span>
						<span class="eq-bar w-[2px] h-full bg-lamp rounded-full" style="animation-delay: 0.25s;"></span>
						<span class="eq-bar w-[2px] h-full bg-lamp rounded-full" style="animation-delay: 0.5s;"></span>
					</span>
					<span class="hidden sm:inline text-[11px] font-medium text-lamp">Audio on</span>
				{:else}
					<IconVolumeOff size={13} stroke={1.5} class="text-faint" />
					<span class="hidden sm:inline text-[11px]">Audio</span>
				{/if}
			</button>

			<!-- Contextual Room Action Button (only on desktop when not in the room) -->
			{#if !isRoom && !inRoom}
				<a
					href={roomLink}
					class="btn btn-primary hidden text-xs font-medium md:inline-flex"
					use:magnetic={0.12}
				>
					{live ? 'Tune in' : 'Step inside'}
				</a>
			{/if}

			<!-- Profile Icon / Modal -->
			<AuthModal />
		</div>
	</div>
</header>
