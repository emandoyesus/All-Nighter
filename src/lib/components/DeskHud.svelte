<script lang="ts">
	import { onMount } from 'svelte';
	import { asset } from '$app/paths';
	import { room } from '#lib/room/room.svelte';
	import { siteAudio } from '#lib/audio/site-audio.svelte';
	import { DAWN } from '#lib/config';
	import { thumbnailFor } from '#lib/room/youtube';
	import IconMinimize from '@tabler/icons-svelte/icons/minimize';
	import IconPlay from '@tabler/icons-svelte/icons/player-play';
	import IconPause from '@tabler/icons-svelte/icons/player-pause';
	import IconSkip from '@tabler/icons-svelte/icons/player-skip-forward';
	import IconDisc from '@tabler/icons-svelte/icons/disc';
	import IconWaveSine from '@tabler/icons-svelte/icons/wave-sine';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconTarget from '@tabler/icons-svelte/icons/target';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const HUD_WALLPAPERS = [
		{ id: 'lofi-desk', label: 'Lofi Desk', src: asset('hud/bg-1.jpg') },
		{ id: 'city-night', label: 'City Night', src: asset('hud/bg-2.jpg') },
		{ id: 'neon-horizon', label: 'Neon Horizon', src: asset('hud/bg-3.jpg') }
	];

	const LS_WALLPAPER = 'an.hud_wallpaper';
	function loadSavedWallpaper(): number {
		try {
			const saved = localStorage.getItem(LS_WALLPAPER);
			if (saved !== null) {
				const n = Number(saved);
				if (n >= 0 && n < HUD_WALLPAPERS.length) return n;
			}
		} catch {}
		return 0;
	}

	let activeWallpaper = $state(0);

	function setWallpaper(idx: number): void {
		activeWallpaper = idx;
		try {
			localStorage.setItem(LS_WALLPAPER, String(idx));
		} catch {}
	}

	let dawnLeft = $state('--:--:--');
	let localClock = $state('');
	let phase = $state<'pre_midnight' | 'session_active'>('pre_midnight');
	let targetLabel = $state('countdown to midnight doors open');
	let pushedHistory = false;

	function onPopState(): void {
		if (open) {
			pushedHistory = false;
			open = false;
		}
	}

	function getDawn(): { h: number; m: number } {
		try {
			const saved = localStorage.getItem('an.dawn_time');
			if (saved) {
				const parsed = JSON.parse(saved);
				if (typeof parsed?.h === 'number' && typeof parsed?.m === 'number') {
					if (parsed.h === 6 && parsed.m === 30) return { ...DAWN };
					return { h: parsed.h, m: parsed.m };
				}
			}
		} catch {}
		return { ...DAWN };
	}

	function updateCountdown(): void {
		const now = new Date();
		localClock = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

		const dawn = getDawn();
		const isSessionHours =
			now.getHours() >= 0 &&
			(now.getHours() < dawn.h || (now.getHours() === dawn.h && now.getMinutes() < dawn.m));

		if (!isSessionHours) {
			phase = 'pre_midnight';
			targetLabel = 'countdown to midnight doors open (00:00)';
			const midnight = new Date(now);
			midnight.setHours(24, 0, 0, 0);
			const diff = Math.max(0, midnight.getTime() - now.getTime());
			const total = Math.floor(diff / 1000);
			const h = Math.floor(total / 3600);
			const m = Math.floor((total % 3600) / 60);
			const s = total % 60;
			dawnLeft = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		} else {
			phase = 'session_active';
			targetLabel = `countdown to sunrise (${String(dawn.h).padStart(2, '0')}:${String(dawn.m).padStart(2, '0')})`;
			const todayDawn = new Date(now);
			todayDawn.setHours(dawn.h, dawn.m, 0, 0);
			const diff = Math.max(0, todayDawn.getTime() - now.getTime());
			const total = Math.floor(diff / 1000);
			const h = Math.floor(total / 3600);
			const m = Math.floor((total % 3600) / 60);
			const s = total % 60;
			dawnLeft = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		}
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			open = false;
		}
	}

	onMount(() => {
		activeWallpaper = loadSavedWallpaper();
		updateCountdown();
		const id = window.setInterval(updateCountdown, 1000);
		window.addEventListener('popstate', onPopState);

		return () => {
			window.clearInterval(id);
			window.removeEventListener('popstate', onPopState);
		};
	});

	function formatModeTime(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	$effect(() => {
		if (typeof document === 'undefined') return;
		if (open) {
			if (!pushedHistory && typeof window !== 'undefined') {
				history.pushState({ deskHud: true }, '', window.location.href);
				pushedHistory = true;
			}
			const prev = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
			return () => {
				document.body.style.overflow = prev;
			};
		} else {
			if (pushedHistory && typeof window !== 'undefined') {
				pushedHistory = false;
				history.back();
			}
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex flex-col justify-between bg-night p-6 md:p-12 text-cream selection:bg-aqua-foam selection:text-cyber-teal overflow-hidden"
		role="dialog"
		aria-modal="true"
	>
		<!-- Dynamic HUD Background Wallpaper -->
		<div class="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
			{#each HUD_WALLPAPERS as wp, idx}
				<img
					src={wp.src}
					alt=""
					class="absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-in-out {activeWallpaper === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}"
					style="filter: brightness(0.78) contrast(1.05);"
				/>
			{/each}
			<!-- Light atmospheric gradient: clear center so artwork shines through -->
			<div class="absolute inset-0 bg-night/25"></div>
			<div class="absolute inset-0 bg-gradient-to-t from-night/85 via-transparent to-night/60"></div>
			<div class="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(3,3,3,0.5)_100%)]"></div>
		</div>

		<!-- Top status bar -->
		<header class="relative z-10 flex flex-wrap items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<span class="soft-blink h-2 w-2 rounded-full bg-lamp"></span>
				<span class="num text-xs tracking-wider uppercase text-faint">
					room / {room.title || room.room}
				</span>
				<span class="text-faint/60">·</span>
				<span class="num text-xs text-taupe">{room.awake.length} awake</span>
			</div>

			<div class="flex items-center gap-3">
				{#if room.mode === 'focus'}
					<span class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-amber-300">
						<IconTarget size={13} stroke={2} />
						Focus {#if room.modeRemaining > 0}· {formatModeTime(room.modeRemaining)}{/if}
					</span>
				{:else}
					<span class="inline-flex items-center gap-1.5 rounded-full border border-lamp/40 bg-lamp/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-lamp">
						<IconWaveSine size={13} stroke={2} />
						Normal {#if room.modeRemaining > 0}· {formatModeTime(room.modeRemaining)}{/if}
					</span>
				{/if}

				<button
					class="btn btn-ghost btn-sm"
					onclick={() => (open = false)}
					title="Exit Desk Mode (Esc)"
				>
					<IconMinimize size={15} stroke={1.5} />
					<span class="hidden sm:inline">Exit HUD</span>
				</button>
			</div>
		</header>

		<!-- Centerpiece: Dawn countdown & now playing -->
		<main class="relative z-10 my-auto flex flex-col items-center justify-center text-center">
			<p class="num text-xs uppercase tracking-[0.2em] text-cream/80 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
				{targetLabel}
			</p>
			<h1 class="num mt-2 font-mono text-6xl font-semibold tracking-tighter text-cream md:text-8xl lg:text-9xl drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
				{dawnLeft}
			</h1>

			<!-- Now Playing Card -->
			<div class="mt-8 flex w-full max-w-xl flex-col items-center rounded-card border border-cream/10 bg-night-2/70 p-6 backdrop-blur-md">
				{#if room.state.current}
					<div class="relative flex w-full min-w-0 items-center gap-5 text-left">
						<!-- Spinning disc animation -->
						<div class="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-cream/20 shadow-lg {room.state.playing ? 'animate-spin' : ''}" style="animation-duration: 8s; animation-timing-function: linear;">
							{#if room.state.current.videoId}
								<img
									src={thumbnailFor(room.state.current.videoId)}
									alt=""
									class="h-full w-full object-cover"
								/>
							{:else}
								<div class="grid h-full w-full place-items-center bg-night-3 text-lamp">
									<IconDisc size={28} stroke={1.5} />
								</div>
							{/if}
							<!-- Center spindle hole -->
							<div class="absolute inset-0 m-auto h-3.5 w-3.5 rounded-full border border-cream/30 bg-night"></div>
						</div>

						<div class="min-w-0 flex-1">
							<p class="num text-[11px] uppercase tracking-wider text-lamp">Now Playing</p>
							<h2 class="mt-0.5 truncate text-lg font-medium text-cream md:text-xl" title={room.state.current.title}>
								{room.state.current.title}
							</h2>
							<p class="truncate text-xs text-taupe">
								{room.state.current.channel ?? 'YouTube'}
								<span class="text-faint/60">·</span>
								added by <strong class="text-cream font-medium">{room.state.current.addedBy}</strong>
							</p>
							{#if room.state.current.dedication}
								<p class="mt-1 truncate text-xs italic text-faint" title={room.state.current.dedication}>
									“{room.state.current.dedication}”
								</p>
							{/if}
						</div>
					</div>
				{:else}
					<div class="flex items-center gap-3 text-taupe">
						<IconDisc size={20} stroke={1.5} class="text-faint" />
						<p class="text-sm">The night is quiet. Add a track to the queue.</p>
					</div>
				{/if}
			</div>
		</main>

		<!-- Bottom controls: Ambient sound + Audio player toggles + Wallpaper picker -->
		<footer class="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-cream/10 pt-6">
			<div class="flex flex-wrap items-center gap-3">
				<!-- Desk Ambience: Interstellar only -->
				<div class="flex items-center gap-2">
					<span class="num text-xs text-faint mr-1">Desk Ambience:</span>
					<button
						class="btn btn-sm text-xs {siteAudio.isPlaying ? 'btn-primary' : 'btn-ghost'}"
						onclick={() => siteAudio.toggle()}
						title={siteAudio.isPlaying ? 'Mute Interstellar soundtrack' : 'Play Interstellar soundtrack'}
					>
						{#if siteAudio.isPlaying}
							<span class="inline-flex items-end gap-[2px] h-3 w-3 mr-1" aria-hidden="true">
								<span class="eq-bar w-[2px] h-full bg-lamp rounded-full" style="animation-delay: 0s;"></span>
								<span class="eq-bar w-[2px] h-full bg-lamp rounded-full" style="animation-delay: 0.25s;"></span>
								<span class="eq-bar w-[2px] h-full bg-lamp rounded-full" style="animation-delay: 0.5s;"></span>
							</span>
						{:else}
							<IconDisc size={14} stroke={1.5} class="mr-1" />
						{/if}
						Interstellar
					</button>
				</div>

				<!-- Wallpaper Picker -->
				<div class="flex items-center gap-1.5 pl-3 border-l border-cream/10">
					<span class="num text-xs text-faint mr-0.5">Wallpaper:</span>
					{#each HUD_WALLPAPERS as wp, idx}
						<button
							type="button"
							class="group relative h-6 w-9 overflow-hidden rounded border transition-all {activeWallpaper === idx ? 'border-lamp ring-1 ring-lamp/50 scale-105' : 'border-cream/20 opacity-55 hover:opacity-100 hover:border-cream/50'}"
							onclick={() => setWallpaper(idx)}
							title={`Switch to "${wp.label}" background`}
							aria-label={`Switch to "${wp.label}" background`}
						>
							<img src={wp.src} alt="" class="h-full w-full object-cover" />
						</button>
					{/each}
				</div>
			</div>

			<!-- Player controls & local clock -->
			<div class="flex items-center gap-3">
				{#if room.canSkip}
					<button
						class="btn btn-ghost btn-sm"
						onclick={() => room.skip()}
						disabled={room.state.queue.length === 0 && !room.state.current}
					>
						<IconSkip size={15} stroke={1.5} />
						Skip
					</button>
				{/if}
				<div class="num text-xs text-faint">
					local {localClock}
				</div>
			</div>
		</footer>
	</div>
{/if}
