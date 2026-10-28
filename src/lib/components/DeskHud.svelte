<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import { ambient, type AmbientType } from '#lib/audio/ambient.svelte';
	import { DAWN } from '#lib/config';
	import { thumbnailFor } from '#lib/room/youtube';
	import IconMinimize from '@tabler/icons-svelte/icons/minimize';
	import IconPlay from '@tabler/icons-svelte/icons/player-play';
	import IconPause from '@tabler/icons-svelte/icons/player-pause';
	import IconSkip from '@tabler/icons-svelte/icons/player-skip-forward';
	import IconCloudRain from '@tabler/icons-svelte/icons/cloud-rain';
	import IconDisc from '@tabler/icons-svelte/icons/disc';
	import IconWaveSine from '@tabler/icons-svelte/icons/wave-sine';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconTarget from '@tabler/icons-svelte/icons/target';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let dawnLeft = $state('--:--:--');
	let localClock = $state('');

	function updateCountdown(): void {
		const now = new Date();
		localClock = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

		const todayDawn = new Date(now);
		todayDawn.setHours(DAWN.h, DAWN.m, 0, 0);
		if (now.getTime() >= todayDawn.getTime()) {
			todayDawn.setDate(todayDawn.getDate() + 1);
		}
		const diff = Math.max(0, todayDawn.getTime() - now.getTime());
		const total = Math.floor(diff / 1000);
		const h = Math.floor(total / 3600);
		const m = Math.floor((total % 3600) / 60);
		const s = total % 60;
		dawnLeft = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			open = false;
		}
	}

	onMount(() => {
		updateCountdown();
		const id = window.setInterval(updateCountdown, 1000);
		return () => window.clearInterval(id);
	});

	function formatModeTime(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex flex-col justify-between bg-night p-6 md:p-12 text-cream selection:bg-lamp selection:text-night"
		role="dialog"
		aria-modal="true"
	>
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
					<span class="inline-flex items-center gap-1.5 rounded-full border border-lamp/40 bg-lamp/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-lamp">
						<IconTarget size={13} stroke={2} />
						Focus mode {#if room.modeRemaining > 0}· {formatModeTime(room.modeRemaining)}{/if}
					</span>
				{:else}
					<span
						class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider text-amber-300"
						style="border: 1px solid color-mix(in srgb, var(--color-amber) 40%, transparent); background: color-mix(in srgb, var(--color-amber) 10%, transparent); color: var(--color-amber)"
					>
						<IconWaveSine size={13} stroke={2} />
						Break mode {#if room.modeRemaining > 0}· {formatModeTime(room.modeRemaining)}{/if}
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
			<p class="num text-xs uppercase tracking-[0.2em] text-faint">
				countdown to sunrise
			</p>
			<h1 class="num mt-2 font-mono text-6xl font-semibold tracking-tighter text-cream md:text-8xl lg:text-9xl">
				{dawnLeft}
			</h1>

			<!-- Now Playing Card -->
			<div class="mt-8 flex max-w-xl flex-col items-center rounded-card border border-cream/10 bg-night-2/70 p-6 backdrop-blur-md">
				{#if room.state.current}
					<div class="relative flex items-center gap-5 text-left">
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

						<div class="min-w-0">
							<p class="num text-[11px] uppercase tracking-wider text-lamp">Now Playing</p>
							<h2 class="mt-0.5 truncate text-lg font-medium text-cream md:text-xl">
								{room.state.current.title}
							</h2>
							<p class="truncate text-xs text-taupe">
								{room.state.current.channel ?? 'YouTube'}
								<span class="text-faint/60">·</span>
								curated by {room.state.current.addedBy}
							</p>
							{#if room.state.current.dedication}
								<p class="mt-1 truncate text-xs italic text-faint">
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

		<!-- Bottom controls: Ambient sound + Audio player toggles -->
		<footer class="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-cream/10 pt-6">
			<!-- Ambient noise toggles -->
			<div class="flex items-center gap-2">
				<span class="num text-xs text-faint mr-1">Desk Ambience:</span>
				<button
					class="btn btn-sm text-xs {ambient.type === 'rain' && ambient.isPlaying ? 'btn-primary' : 'btn-ghost'}"
					onclick={() => ambient.setType('rain')}
					title="Rain against desk window"
				>
					<IconCloudRain size={14} stroke={1.5} />
					Rain
				</button>
				<button
					class="btn btn-sm text-xs {ambient.type === 'vinyl' && ambient.isPlaying ? 'btn-primary' : 'btn-ghost'}"
					onclick={() => ambient.setType('vinyl')}
					title="Vinyl needle crackle & dust"
				>
					<IconDisc size={14} stroke={1.5} />
					Vinyl
				</button>
				<button
					class="btn btn-sm text-xs {ambient.type === 'tape' && ambient.isPlaying ? 'btn-primary' : 'btn-ghost'}"
					onclick={() => ambient.setType('tape')}
					title="Warm lo-fi tape hiss"
				>
					<IconWaveSine size={14} stroke={1.5} />
					Tape
				</button>

				{#if ambient.isPlaying && ambient.type !== 'none'}
					<input
						type="range"
						min="0"
						max="100"
						value={ambient.volume}
						oninput={(e) => ambient.setVolume(Number(e.currentTarget.value))}
						class="seek w-16 ml-1 cursor-pointer"
						title="Ambient volume: {ambient.volume}%"
					/>
				{/if}
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
