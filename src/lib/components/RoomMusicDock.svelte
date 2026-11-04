<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { room } from '#lib/room/room.svelte';
	import { thumbnailFor, formatTime } from '#lib/room/youtube';
	import AudioVisualizer from './AudioVisualizer.svelte';
	import IconPlay from '@tabler/icons-svelte/icons/player-play';
	import IconPause from '@tabler/icons-svelte/icons/player-pause';
	import IconSkip from '@tabler/icons-svelte/icons/player-skip-forward';
	import IconVolume from '@tabler/icons-svelte/icons/volume';
	import IconVolumeOff from '@tabler/icons-svelte/icons/volume-off';
	import IconDisc from '@tabler/icons-svelte/icons/disc';
	import IconMaximize from '@tabler/icons-svelte/icons/maximize';
	import IconRadio from '@tabler/icons-svelte/icons/radio';
	import IconFlame from '@tabler/icons-svelte/icons/flame';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconHeadphones from '@tabler/icons-svelte/icons/headphones';

	const track = $derived(room.state.current);
	const playing = $derived(room.state.playing);
	const queued = $derived(room.state.queue.length);
	const reactions = $derived(track?.reactions ?? {});

	let localTime = $state(0);
	let duration = $state(0);
	let volume = $state(80);
	let muted = $state(false);

	function loadSavedVolume(): number {
		try {
			const saved = localStorage.getItem('an.volume');
			if (saved !== null) {
				const n = Number(saved);
				if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
			}
		} catch {}
		return 80;
	}

	onMount(() => {
		volume = loadSavedVolume();

		const onStatus = (e: Event) => {
			const custom = e as CustomEvent<{
				localTime: number;
				duration: number;
				volume: number;
				muted: boolean;
			}>;
			if (custom.detail) {
				localTime = custom.detail.localTime ?? 0;
				duration = custom.detail.duration ?? 0;
				volume = custom.detail.volume ?? volume;
				muted = custom.detail.muted ?? false;
			}
		};

		window.addEventListener('an:player:status', onStatus);
		return () => window.removeEventListener('an:player:status', onStatus);
	});

	function togglePlay(): void {
		window.dispatchEvent(new CustomEvent('an:player:toggle'));
	}

	function skipTrack(): void {
		if (room.canSkip) {
			window.dispatchEvent(new CustomEvent('an:player:skip'));
		}
	}

	function handleVolumeInput(e: Event): void {
		const val = Number((e.target as HTMLInputElement).value);
		volume = val;
		muted = val === 0;
		window.dispatchEvent(new CustomEvent('an:player:set-volume', { detail: val }));
	}

	function toggleMute(): void {
		window.dispatchEvent(new CustomEvent('an:player:toggle-mute'));
	}

	function scrollToPlayer(): void {
		if (typeof window !== 'undefined' && window.location.pathname !== '/room') {
			goto(room.room ? `/room?room=${room.room}` : '/room');
			return;
		}
		const playerEl =
			document.getElementById('room-video-viewport') ||
			document.querySelector('iframe') ||
			document.querySelector('.panel');
		playerEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	function openDeskHud(): void {
		window.dispatchEvent(new CustomEvent('an:open-desk-hud'));
	}
</script>

{#if room.joinState === 'approved'}
<aside
	class="fixed bottom-0 inset-x-0 z-40 border-t border-lamp/20 bg-night-2/95 shadow-[0_-10px_35px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all select-none"
	aria-label="Room music dock"
>
	<!-- Main Dock Bar -->
	<div class="mx-auto flex h-16 sm:h-[72px] max-w-[1400px] items-center justify-between gap-3 px-4 md:px-6">
		{#if track}
			<!-- LEFT: Track Metadata & Audio Visualizer -->
			<div class="flex min-w-0 items-center gap-3 md:w-[320px] lg:w-[360px]">
				<!-- Thumbnail / Disc Art -->
				<button
					class="group relative h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-lg border border-cream/15 bg-night-3 transition-transform hover:scale-105"
					onclick={scrollToPlayer}
					title="Scroll to full video"
					aria-label="Scroll to full video"
				>
					{#if track.source === 'youtube' && track.videoId}
						<img
							src={thumbnailFor(track.videoId)}
							alt=""
							class="h-full w-full object-cover"
						/>
					{:else}
						<div class="grid h-full w-full place-items-center text-lamp">
							<IconDisc size={20} stroke={1.5} class={playing ? 'animate-spin' : ''} style="animation-duration: 4s;" />
						</div>
					{/if}
				</button>

				<!-- Title, Artist & Visualizer -->
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<button
							class="truncate text-left text-xs sm:text-sm font-medium text-cream hover:text-lamp transition-colors"
							onclick={scrollToPlayer}
						>
							{track.title}
						</button>
						{#if track.isPlaylist}
							<span class="shrink-0 rounded bg-cyan/15 px-1.5 py-0.2 text-[9px] font-mono uppercase text-cyan font-semibold tracking-wider">
								Playlist
							</span>
						{/if}
						<AudioVisualizer active={playing} size="sm" class="shrink-0 hidden xs:inline-flex" />
					</div>
					<div class="flex items-center gap-1.5 truncate text-[11px] text-faint">
						<span class="truncate text-taupe">{track.channel ?? track.source}</span>
						<span>·</span>
						<span class="truncate">via {track.addedBy}</span>
					</div>
				</div>
			</div>

			<!-- CENTER: Transport Controls & Scrub Progress -->
			<div class="flex flex-1 flex-col items-center justify-center max-w-[540px]">
				<div class="flex items-center gap-3 sm:gap-4">
					<!-- Play / Pause Button -->
					<button
						class="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-transform active:scale-95 {playing
							? 'bg-cyber-teal text-aqua-foam ring-1 ring-aqua-foam/40'
							: 'bg-cream text-night hover:bg-cream/90'}"
						onclick={togglePlay}
						title={playing ? 'Pause (Space)' : 'Play (Space)'}
						aria-label={playing ? 'Pause' : 'Play'}
					>
						{#if playing}
							<IconPause size={16} stroke={2.5} />
						{:else}
							<IconPlay size={16} stroke={2.5} class="ml-0.5" />
						{/if}
					</button>

					<!-- Skip Button -->
					<button
						class="flex h-7 w-7 items-center justify-center rounded-full text-taupe transition-colors hover:text-cream disabled:opacity-30 disabled:hover:text-taupe"
						onclick={skipTrack}
						disabled={queued === 0 || !room.canSkip}
						title={room.canSkip ? (room.isHost ? 'Host skip' : 'Solo skip') : 'Only host can skip'}
						aria-label="Skip to next track"
					>
						<IconSkip size={16} stroke={1.5} />
					</button>
				</div>

				<!-- Track Time & Progress bar -->
				<div class="mt-1 flex w-full items-center gap-2 text-[10px] font-mono text-faint">
					<span class="w-9 text-right">{formatTime(localTime)}</span>
					<div class="relative h-1 w-full rounded-full bg-cream/15 overflow-hidden">
						<div
							class="h-full bg-gradient-to-r from-lamp via-lamp to-amber transition-all duration-300"
							style="width: {duration > 0 ? (localTime / duration) * 100 : 0}%"
						></div>
					</div>
					<span class="w-9">{duration > 0 ? formatTime(duration) : 'live'}</span>
				</div>
			</div>

			<!-- RIGHT: Reactions, Volume, Desk HUD -->
			<div class="flex items-center justify-end gap-2 sm:gap-3 md:w-[320px] lg:w-[360px]">
				<!-- Quick Reactions -->
				<div class="hidden lg:flex items-center gap-1 border-r border-cream/10 pr-2">
					<button
						class="rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-xs text-amber transition-colors hover:border-amber/60 hover:bg-amber/20"
						onclick={() => room.react(track.uid, '🔥')}
						title="React Fire"
					>
						🔥 {#if (reactions['🔥']?.length ?? 0) > 0}<span class="text-[10px] text-amber-2">{reactions['🔥'].length}</span>{/if}
					</button>
					<button
						class="rounded-full border border-cream/10 bg-night/60 px-2 py-0.5 text-xs transition-colors hover:border-lamp/40 hover:bg-lamp/10"
						onclick={() => room.react(track.uid, '🌙')}
						title="React Moon"
					>
						🌙 {#if (reactions['🌙']?.length ?? 0) > 0}<span class="text-[10px] text-taupe">{reactions['🌙'].length}</span>{/if}
					</button>
					<button
						class="rounded-full border border-cream/10 bg-night/60 px-2 py-0.5 text-xs transition-colors hover:border-lamp/40 hover:bg-lamp/10"
						onclick={() => room.react(track.uid, '🎧')}
						title="React Headphones"
					>
						🎧 {#if (reactions['🎧']?.length ?? 0) > 0}<span class="text-[10px] text-taupe">{reactions['🎧'].length}</span>{/if}
					</button>
				</div>

				<!-- Volume Slider & Mute -->
				<div class="flex items-center gap-1.5">
					<button
						class="icon-btn text-faint hover:text-cream"
						onclick={toggleMute}
						title={muted || volume === 0 ? 'Unmute' : 'Mute'}
						aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
					>
						{#if muted || volume === 0}
							<IconVolumeOff size={16} stroke={1.5} />
						{:else}
							<IconVolume size={16} stroke={1.5} class="text-lamp" />
						{/if}
					</button>
					<input
						type="range"
						min="0"
						max="100"
						class="h-1 w-14 sm:w-20 cursor-pointer appearance-none rounded-full bg-cream/15 accent-lamp"
						value={muted ? 0 : volume}
						oninput={handleVolumeInput}
						aria-label="Room playback volume"
						title="Volume: {muted ? 0 : volume}%"
					/>
				</div>

				<!-- Fullscreen Desk HUD trigger -->
				<button
					class="icon-btn text-faint hover:text-lamp transition-colors"
					onclick={openDeskHud}
					title="Open Fullscreen Desk HUD"
					aria-label="Open Fullscreen Desk HUD"
				>
					<IconMaximize size={16} stroke={1.5} />
				</button>
			</div>
		{:else}
			<div class="flex flex-1 items-center justify-between gap-3">
				<div class="flex items-center gap-2.5">
					<span class="grid h-8 w-8 place-items-center rounded-full bg-lamp/10 text-lamp">
						<IconRadio size={16} stroke={1.5} />
					</span>
					<div>
						<p class="text-xs font-medium text-cream">The room is quiet</p>
						<p class="text-[11px] text-faint">Paste any link into the queue to start playing</p>
					</div>
				</div>

				<!-- Desk HUD trigger -->
				<div class="hidden md:flex items-center">
					<button
						class="btn btn-ghost btn-sm text-xs font-mono"
						onclick={openDeskHud}
					>
						<IconMaximize size={14} stroke={1.5} />
						Desk HUD
					</button>
				</div>
			</div>
		{/if}
	</div>
</aside>
{/if}
