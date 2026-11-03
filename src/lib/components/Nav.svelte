<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import { siteAudio } from '#lib/audio/site-audio.svelte';
	import { gsap, prefersReducedMotion, setupGsap } from '#lib/motion';
	import { magnetic } from '#lib/magnetic';
	import { ambientMusic } from '#lib/audio/ambient-music.svelte';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconRadio from '@tabler/icons-svelte/icons/radio';
	import IconVolume from '@tabler/icons-svelte/icons/volume';
	import IconVolumeOff from '@tabler/icons-svelte/icons/volume-off';
	import AuthModal from './AuthModal.svelte';

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
	class="sticky top-0 z-50 border-b border-cream/10 bg-night/85 backdrop-blur-md"
>
	<div class="mx-auto flex h-16 max-w-[1400px] items-center gap-5 px-5 md:h-[68px]">
		<a href="/" class="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight">
			<IconMoon size={20} stroke={1.5} class="text-lamp" />
			<span>All Nighter</span>
		</a>

		<div class="ml-auto flex items-center gap-3 sm:gap-4">
			<nav class="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm text-taupe lg:gap-7">
				<a class="transition-colors hover:text-cream" href="/">Tonight</a>
				<a class="transition-colors hover:text-cream {inRoom ? 'text-cream font-medium' : ''}" href={roomLink}>
					{#if inRoom}
						<span class="inline-flex items-center gap-1.5">
							<span class="h-1.5 w-1.5 rounded-full bg-amber soft-blink"></span>
							{room.title || 'The Room'}
						</span>
					{:else}
						The Room
					{/if}
				</a>
				<a class="transition-colors hover:text-cream" href="/archive">The Archive</a>
			</nav>

			<!-- Website Sound Quick Toggle (Interstellar soundtrack in background) -->
			<button
				class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono transition-all {siteAudio.isPlaying
					? 'border-cyan/50 bg-cyan/15 text-cyan hover:bg-cyan/25'
					: 'border-cream/12 bg-night/80 text-faint hover:border-cream/25 hover:text-cream'}"
				onclick={toggleSound}
				title={siteAudio.isPlaying ? 'Mute Interstellar soundtrack' : 'Play Interstellar soundtrack'}
				aria-label={siteAudio.isPlaying ? 'Mute soundtrack' : 'Play soundtrack'}
			>
				{#if siteAudio.isPlaying}
					<span class="soft-blink h-1.5 w-1.5 rounded-full bg-cyan"></span>
					<IconVolume size={13} stroke={2} class="text-cyan" />
					<span class="hidden sm:inline text-[11px] font-medium text-cyan">Sound on</span>
				{:else}
					<IconVolumeOff size={13} stroke={1.5} />
					<span class="hidden sm:inline text-[11px]">Sound</span>
				{/if}
			</button>

			<AuthModal />

			{#if inRoom}
				<a
					href={roomLink}
					class="hidden items-center gap-2 rounded-full border border-amber/40 bg-amber/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-amber transition-colors hover:bg-amber/20 sm:inline-flex"
					use:magnetic={0.1}
				>
					<span class="soft-blink h-1.5 w-1.5 rounded-full bg-amber"></span>
					In Room
					<IconRadio size={12} stroke={1.5} />
				</a>
			{:else if live}
				<!-- Live Studio Red Light -->
				<a
					href={roomLink}
					class="hidden items-center gap-2 rounded-full border border-ruby/50 bg-ruby/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-rose-300 transition-all hover:bg-ruby/25 hover:border-ruby sm:inline-flex"
					use:magnetic={0.1}
				>
					<span class="soft-blink h-2 w-2 rounded-full bg-ruby"></span>
					ON AIR
					<IconRadio size={12} stroke={1.5} class="text-rose-400" />
				</a>
			{:else}
				<a
					href={roomLink}
					class="btn btn-primary hidden text-[13px] sm:inline-flex sm:text-sm"
					use:magnetic={0.12}
				>
					Open the door
				</a>
			{/if}
		</div>
	</div>
</header>
