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
	let open = $state(false);

	let header: HTMLElement;
	let menuEl: HTMLElement | undefined = $state();
	let lastY = 0;
	let hidden = false;

	onMount(() => {
		if (prefersReducedMotion()) return;

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
		return () => window.removeEventListener('scroll', onScroll);
	});

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
				<a class="transition-colors hover:text-cream" href="/room">The Room</a>
				<a class="transition-colors hover:text-cream" href="/archive">The Archive</a>
			</nav>

			<!-- Ambient Soundscape Quick Toggle -->
			<button
				class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono transition-colors {ambientMusic.isPlaying
					? 'border-lamp/40 bg-lamp/15 text-lamp'
					: 'border-cream/12 bg-night/80 text-faint hover:border-cream/25 hover:text-cream'}"
				onclick={() => ambientMusic.toggle()}
				title={ambientMusic.isPlaying ? 'Mute ambient soundscape' : 'Play soft ambient soundscape'}
				aria-label={ambientMusic.isPlaying ? 'Mute ambient soundscape' : 'Play soft ambient soundscape'}
			>
				{#if ambientMusic.isPlaying}
					<span class="soft-blink h-1.5 w-1.5 rounded-full bg-lamp"></span>
					<IconVolume size={13} stroke={2} />
					<span class="hidden sm:inline text-[11px]">Ambient on</span>
				{:else}
					<IconVolumeOff size={13} stroke={1.5} />
					<span class="hidden sm:inline text-[11px]">Ambient</span>
				{/if}
			</button>

			{#if live}
				<a
					href="/room"
					class="hidden items-center gap-2 rounded-full border border-lamp/40 bg-lamp/8 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-lamp transition-colors hover:bg-lamp/15 sm:inline-flex"
					use:magnetic={0.1}
				>
					<span class="soft-blink h-1.5 w-1.5 rounded-full bg-lamp"></span>
					On air
					<IconRadio size={12} stroke={1.5} />
				</a>
			{:else}
				<a
					href="/room"
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
					class="rounded-field px-3 py-2 text-taupe transition-colors hover:bg-cream/5 hover:text-cream"
					href="/room"
					onclick={closeMenu}
				>
					The Room
				</a>
				<a
					class="rounded-field px-3 py-2 text-taupe transition-colors hover:bg-cream/5 hover:text-cream"
					href="/archive"
					onclick={closeMenu}
				>
					The Archive
				</a>
				<button
					class="flex items-center justify-between rounded-field px-3 py-2 text-left text-sm transition-colors {ambientMusic.isPlaying
						? 'bg-lamp/10 text-lamp'
						: 'text-taupe hover:bg-cream/5 hover:text-cream'}"
					onclick={() => ambientMusic.toggle()}
				>
					<span class="flex items-center gap-2">
						{#if ambientMusic.isPlaying}
							<IconVolume size={16} stroke={2} class="text-lamp" />
							<span class="font-medium text-cream">Soft ambient music (Playing)</span>
						{:else}
							<IconVolumeOff size={16} stroke={1.5} />
							<span>Soft ambient music (Off)</span>
						{/if}
					</span>
					{#if ambientMusic.isPlaying}
						<span class="soft-blink h-1.5 w-1.5 rounded-full bg-lamp"></span>
					{/if}
				</button>
				<div class="pt-1">
					<a
						href="/room"
						class="btn btn-primary w-full text-xs"
						onclick={closeMenu}
					>
						Open the door
					</a>
				</div>
			</nav>
		</div>
	{/if}
</header>
