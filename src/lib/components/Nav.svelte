<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import { gsap, prefersReducedMotion, setupGsap } from '#lib/motion';
	import { magnetic } from '#lib/magnetic';
	import { ambientMusic } from '#lib/audio/ambient-music.svelte';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconMenu2 from '@tabler/icons-svelte/icons/menu-2';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconRadio from '@tabler/icons-svelte/icons/radio';
	import IconVolume from '@tabler/icons-svelte/icons/volume';
	import IconVolumeOff from '@tabler/icons-svelte/icons/volume-off';

	const live = $derived(room.state.playing);
	const inRoom = $derived(room.joinState === 'approved');
	const roomLink = $derived(room.room ? `/room?room=${room.room}` : '/room');
	let open = $state(false);

	let playerMuted = $state(true);
	let playerUnlocked = $state(false);
	const soundPlaying = $derived(room.state.playing && !playerMuted && playerUnlocked);

	let header: HTMLElement;
	let menuEl: HTMLElement | undefined = $state();
	let lastY = 0;
	let hidden = false;

	onMount(() => {
		// Stop any legacy procedural audio
		ambientMusic.pause();

		const onPlayerStatus = (e: Event) => {
			const custom = e as CustomEvent<{
				muted: boolean;
				unlocked: boolean;
			}>;
			if (custom.detail) {
				if (typeof custom.detail.muted === 'boolean') playerMuted = custom.detail.muted;
				if (typeof custom.detail.unlocked === 'boolean') playerUnlocked = custom.detail.unlocked;
			}
		};
		window.addEventListener('an:player:status', onPlayerStatus);

		if (prefersReducedMotion()) {
			return () => {
				window.removeEventListener('an:player:status', onPlayerStatus);
			};
		}

		setupGsap();
		lastY = window.scrollY;

		const onScroll = () => {
			const y = window.scrollY;

			if (open) {
				lastY = y;
				return;
			}

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
			window.removeEventListener('an:player:status', onPlayerStatus);
		};
	});

	function toggleSound(): void {
		if (soundPlaying) {
			window.dispatchEvent(new CustomEvent('an:player:toggle-mute'));
		} else {
			window.dispatchEvent(new CustomEvent('an:player:unlock'));
			if (!room.state.playing) {
				window.dispatchEvent(new CustomEvent('an:player:toggle'));
			}
		}
	}

	function menuIntro(node: HTMLElement) {
		if (prefersReducedMotion()) return {};

		setupGsap();

		const links = node.querySelectorAll('a');
		gsap.fromTo(node, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' });
		const tween = gsap.fromTo(
			links,
			{ opacity: 0, y: 8 },
			{ opacity: 1, y: 0, duration: 0.35, stagger: 0.045, delay: 0.04, ease: 'power3.out' }
		);

		return {
			destroy() {
				tween.kill();
			}
		};
	}

	function closeMenu(): void {
		if (prefersReducedMotion() || !menuEl) {
			open = false;
			return;
		}

		gsap.to(menuEl, {
			opacity: 0,
			y: -6,
			duration: 0.18,
			ease: 'power2.in',
			overwrite: true,
			onComplete: () => (open = false)
		});
	}

	function toggleMenu(): void {
		if (open) {
			closeMenu();
			return;
		}

		open = true;

		if (!prefersReducedMotion()) {
			hidden = false;
			gsap.to(header, { yPercent: 0, duration: 0.3, ease: 'power3.out', overwrite: true });
		}
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
			<nav class="hidden items-center gap-6 text-sm text-taupe md:flex lg:gap-7">
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

			<!-- Sound Quick Toggle (Cosmic Cyan) -->
			<button
				class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono transition-all {soundPlaying
					? 'border-cyan/50 bg-cyan/15 text-cyan hover:bg-cyan/25 shadow-[0_0_12px_rgba(56,217,220,0.25)]'
					: 'border-cream/12 bg-night/80 text-faint hover:border-cream/25 hover:text-cream'}"
				onclick={toggleSound}
				title={soundPlaying ? 'Mute Interstellar soundtrack' : 'Play Interstellar soundtrack'}
				aria-label={soundPlaying ? 'Mute soundtrack' : 'Play soundtrack'}
			>
				{#if soundPlaying}
					<span class="soft-blink h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_8px_#38d9dc]"></span>
					<IconVolume size={13} stroke={2} class="text-cyan" />
					<span class="hidden sm:inline text-[11px] font-medium text-cyan">Sound on</span>
				{:else}
					<IconVolumeOff size={13} stroke={1.5} />
					<span class="hidden sm:inline text-[11px]">Sound</span>
				{/if}
			</button>

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
					class="hidden items-center gap-2 rounded-full border border-ruby/50 bg-ruby/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-rose-300 transition-all hover:bg-ruby/25 hover:border-ruby shadow-[0_0_12px_rgba(255,51,75,0.3)] sm:inline-flex"
					use:magnetic={0.1}
				>
					<span class="soft-blink h-2 w-2 rounded-full bg-ruby shadow-[0_0_8px_#ff334b]"></span>
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

			<button
				class="icon-btn text-cream md:hidden"
				onclick={toggleMenu}
				aria-label={open ? 'Close menu' : 'Open menu'}
				aria-expanded={open}
			>
				{#if open}
					<IconX size={20} stroke={1.5} />
				{:else}
					<IconMenu2 size={20} stroke={1.5} />
				{/if}
			</button>
		</div>
	</div>

	{#if open}
		<div
			class="border-t border-cream/10 bg-night/95 px-5 py-4 backdrop-blur-lg md:hidden"
			bind:this={menuEl}
			use:menuIntro
		>
			<nav class="flex flex-col gap-2.5 text-sm">
				<a
					class="rounded-field px-3 py-2 text-cream transition-colors hover:bg-cream/5"
					href="/"
					onclick={closeMenu}
				>
					Tonight
				</a>
				<a
					class="rounded-field px-3 py-2 {inRoom ? 'text-amber bg-amber/10' : 'text-taupe hover:text-cream'} transition-colors hover:bg-cream/5"
					href={roomLink}
					onclick={closeMenu}
				>
					{#if inRoom}
						<span class="inline-flex items-center gap-2">
							<span class="soft-blink h-1.5 w-1.5 rounded-full bg-amber"></span>
							{room.title || 'The Room'} (Active)
						</span>
					{:else}
						The Room
					{/if}
				</a>
				<a
					class="rounded-field px-3 py-2 text-taupe transition-colors hover:bg-cream/5 hover:text-cream"
					href="/archive"
					onclick={closeMenu}
				>
					The Archive
				</a>
				<button
					class="flex items-center justify-between rounded-field px-3 py-2 text-left text-sm transition-colors {soundPlaying
						? 'bg-cyan/15 text-cyan border border-cyan/30'
						: 'text-taupe hover:bg-cream/5 hover:text-cream'}"
					onclick={toggleSound}
				>
					<span class="flex items-center gap-2">
						{#if soundPlaying}
							<IconVolume size={16} stroke={2} class="text-cyan" />
							<span class="font-medium text-cyan">Sound: Interstellar (Playing)</span>
						{:else}
							<IconVolumeOff size={16} stroke={1.5} />
							<span>Sound: Interstellar (Off)</span>
						{/if}
					</span>
					{#if soundPlaying}
						<span class="soft-blink h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_6px_#38d9dc]"></span>
					{/if}
				</button>
				<div class="pt-1">
					<a
						href={roomLink}
						class="btn btn-primary w-full text-xs"
						onclick={closeMenu}
					>
						{inRoom ? 'Return to Room' : 'Open the door'}
					</a>
				</div>
			</nav>
		</div>
	{/if}
</header>
