<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import { formatTime } from '#lib/room/youtube';
	import { ambient } from '#lib/audio/ambient.svelte';
	import { crate, type CratePick } from '#lib/data/crate';
	import DeskHud from './DeskHud.svelte';
	import AudioVisualizer from './AudioVisualizer.svelte';
	import IconPlay from '@tabler/icons-svelte/icons/player-play';
	import IconPause from '@tabler/icons-svelte/icons/player-pause';
	import IconSkip from '@tabler/icons-svelte/icons/player-skip-forward';
	import IconVolume from '@tabler/icons-svelte/icons/volume';
	import IconVolumeOff from '@tabler/icons-svelte/icons/volume-off';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconExternal from '@tabler/icons-svelte/icons/external-link';
	import IconCloudRain from '@tabler/icons-svelte/icons/cloud-rain';
	import IconDisc from '@tabler/icons-svelte/icons/disc';
	import IconWaveSine from '@tabler/icons-svelte/icons/wave-sine';
	import IconMaximize from '@tabler/icons-svelte/icons/maximize';

	let ready = $state(false);
	let unlocked = $state(false);
	let localTime = $state(0);
	let duration = $state(0);
	let drift = $state(0);
	let volume = $state(80);
	let muted = $state(false);
	let apiError = $state(false);
	let showDeskHud = $state(false);

	const hasVideo = $derived(!!room.state.videoId);
	const playing = $derived(room.state.playing);
	const queued = $derived(room.state.queue.length);
	const externalOnly = $derived(
		!!room.state.current && !room.state.videoId && room.state.source !== 'youtube'
	);

	function sourceLabel(source: string | undefined): string {
		if (source === 'spotify') return 'Spotify';
		if (source === 'soundcloud') return 'SoundCloud';
		return 'the source';
	}

	const stationIcons: Record<string, string> = {
		'Interstellar Main Theme - Extra Extended': '🌌',
		'Alone': '⚡',
		'beats to relax / study to': '☕',
		'beats to sleep / chill to': '🌙',
		'Chillhop Radio': '🎧',
		'shinjuku fm, soft lofi / smooth jazz': '🎷',
		'Nightride FM, synthwave radio': '🌆'
	};

	function startStation(pick: CratePick): void {
		const newTrack = {
			uid: crypto.randomUUID(),
			videoId: pick.videoId,
			source: 'youtube' as const,
			url: `https://www.youtube.com/watch?v=${pick.videoId}`,
			title: pick.title,
			channel: pick.channel,
			addedBy: room.name,
			addedById: room.clientId,
			votes: 0,
			voters: [] as string[],
			reactions: {}
		};
		room.playNow(newTrack);
	}

	function unlock(): void {
		unlocked = true;
		window.dispatchEvent(new CustomEvent('an:player:unlock'));
	}

	function setVolume(val: number): void {
		volume = Math.max(0, Math.min(100, Math.round(val)));
		muted = volume === 0;
		window.dispatchEvent(new CustomEvent('an:player:set-volume', { detail: volume }));
	}

	function toggle(): void {
		window.dispatchEvent(new CustomEvent('an:player:toggle'));
	}

	function skip(): void {
		window.dispatchEvent(new CustomEvent('an:player:skip'));
	}

	function scrub(e: Event): void {
		const value = Number((e.currentTarget as HTMLInputElement).value);
		localTime = value;
		window.dispatchEvent(new CustomEvent('an:player:seek', { detail: value }));
	}

	function toggleMute(): void {
		window.dispatchEvent(new CustomEvent('an:player:toggle-mute'));
	}

	function handleKeydown(e: KeyboardEvent): void {
		const target = e.target as HTMLElement | null;
		if (
			target?.tagName === 'INPUT' ||
			target?.tagName === 'TEXTAREA' ||
			target?.isContentEditable
		) {
			return;
		}

		if (e.code === 'Space') {
			e.preventDefault();
			toggle();
		} else if (e.key === 'm' || e.key === 'M') {
			e.preventDefault();
			toggleMute();
		} else if ((e.key === 'n' || e.key === 'N') && e.shiftKey) {
			e.preventDefault();
			skip();
		}
	}

	onMount(() => {
		const onStatus = (e: Event) => {
			const custom = e as CustomEvent<{
				localTime: number;
				duration: number;
				volume: number;
				muted: boolean;
				ready?: boolean;
				unlocked?: boolean;
				apiError?: boolean;
				drift?: number;
			}>;
			if (custom.detail) {
				localTime = custom.detail.localTime ?? 0;
				duration = custom.detail.duration ?? 0;
				volume = custom.detail.volume ?? volume;
				muted = custom.detail.muted ?? false;
				if (typeof custom.detail.ready === 'boolean') ready = custom.detail.ready;
				if (typeof custom.detail.unlocked === 'boolean') unlocked = custom.detail.unlocked;
				if (typeof custom.detail.apiError === 'boolean') apiError = custom.detail.apiError;
				if (typeof custom.detail.drift === 'number') drift = custom.detail.drift;
			}
		};

		const onOpenDeskHud = () => (showDeskHud = true);

		window.addEventListener('an:player:status', onStatus);
		window.addEventListener('an:open-desk-hud', onOpenDeskHud);

		return () => {
			window.removeEventListener('an:player:status', onStatus);
			window.removeEventListener('an:open-desk-hud', onOpenDeskHud);
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="panel overflow-hidden">
	<div class="flex items-center justify-between gap-3 border-b border-cream/10 px-4 py-3">
		<div class="min-w-0">
			{#if room.state.current}
				<p class="truncate text-sm font-medium">{room.state.current.title}</p>
				<p class="truncate text-xs text-faint">
					{room.state.current.channel ?? 'YouTube'}
					<span class="text-faint/70">·</span>
					{room.state.current.addedBy}
				</p>
			{:else}
				<p class="text-sm text-taupe">Nothing on right now</p>
			{/if}
		</div>
		{#if playing && hasVideo}
			<AudioVisualizer active={playing} bars={5} size="sm" class="shrink-0" />
		{/if}
	</div>

	<!-- Video mount target for persistent GlobalPlayer -->
	<div id="room-video-viewport" class="relative aspect-video bg-night overflow-hidden">
		{#if apiError}
			<div class="absolute inset-0 grid place-items-center bg-night-3 px-8 text-center z-10">
				<p class="max-w-[36ch] text-sm text-taupe">
					The player could not load. Check your network, the queue is still here.
				</p>
			</div>
		{:else if externalOnly && room.state.current}
			<div class="absolute inset-0 grid place-items-center bg-night-3 px-8 text-center z-10">
				<div>
					<span
						class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-lamp/12 text-lamp ring-1 ring-lamp/25"
					>
						<IconMusic size={22} stroke={1.5} />
					</span>
					<h3 class="mt-4 text-lg font-medium">{room.state.current.title}</h3>
					<p class="mx-auto mt-1.5 max-w-[40ch] text-sm leading-relaxed text-taupe">
						This track lives on {sourceLabel(room.state.source)}. Open it there to listen along — the
						queue and chat stay in sync here.
					</p>
					{#if room.state.current.url}
						<a
							href={room.state.current.url}
							target="_blank"
							rel="noreferrer"
							class="btn btn-primary mt-4"
						>
							<IconExternal size={16} stroke={1.5} />
							Open on {sourceLabel(room.state.source)}
						</a>
					{/if}
				</div>
			</div>
		{:else if !hasVideo}
			<div class="absolute inset-0 flex flex-col items-center justify-center bg-night-3 px-6 text-center z-10">
				<div class="w-full max-w-[420px]">
					<span
						class="mx-auto grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-lamp/12 text-lamp ring-1 ring-lamp/25"
					>
						<IconMusic size={20} stroke={1.5} />
					</span>
					<h3 class="mt-3 text-base sm:text-lg font-medium">The room is quiet</h3>
					<p class="mx-auto mt-1 max-w-[36ch] text-xs leading-relaxed text-taupe">
						Paste a link into the queue, or tune into a 24/7 curated station:
					</p>

					<!-- One-Click Curated Stations -->
					<div class="mt-4 grid grid-cols-2 gap-2 text-left">
						{#each crate.slice(0, 4) as station}
							<button
								type="button"
								class="flex items-center gap-2 rounded-xl border border-cream/10 bg-night-2/90 p-2 text-left transition-all hover:border-lamp/50 hover:bg-lamp/10 active:scale-95"
								onclick={() => startStation(station)}
							>
								<span class="text-base shrink-0">
									{stationIcons[station.title] || '📻'}
								</span>
								<div class="min-w-0 flex-1">
									<p class="truncate text-xs font-medium text-cream">{station.title}</p>
									<p class="truncate text-[10px] text-faint">{station.channel}</p>
								</div>
							</button>
						{/each}
					</div>
				</div>
			</div>
		{:else if ready && !unlocked}
			<div class="absolute inset-0 z-30 grid place-items-center bg-night/80 backdrop-blur-[2px] px-8 text-center">
				<div>
					<p class="text-sm text-taupe">Playback stays synced for everyone.</p>
					<button class="btn btn-primary mt-4" onclick={unlock}>
						<IconVolume size={16} stroke={1.5} />
						Turn it on
					</button>
				</div>
			</div>
		{/if}
	</div>

	<div class="flex items-center gap-3 border-t border-cream/10 px-4 py-3">
		<button
			class="icon-btn"
			onclick={toggle}
			disabled={!hasVideo}
			aria-label={playing ? 'Pause for everyone' : 'Resume for everyone'}
		>
			{#if playing}
				<IconPause size={18} stroke={1.5} />
			{:else}
				<IconPlay size={18} stroke={1.5} />
			{/if}
		</button>

		<button
			class="icon-btn"
			onclick={skip}
			disabled={queued === 0 || !room.canSkip}
			aria-label="Skip to the next track"
			title={room.canSkip ? (room.isHost ? 'Host skip' : 'Solo skip') : 'Only host can skip'}
		>
			<IconSkip size={18} stroke={1.5} />
		</button>

		<span class="num w-11 shrink-0 text-right text-xs text-taupe">{formatTime(localTime)}</span>

		<input
			type="range"
			class="seek min-w-0 flex-1"
			min="0"
			max={duration > 0 ? duration : 100}
			step="1"
			value={duration > 0 ? Math.min(localTime, duration) : 0}
			oninput={scrub}
			disabled={!hasVideo || duration <= 0}
			aria-label="Seek within the track"
		/>

		<span class="num w-11 shrink-0 text-xs text-faint">
			{duration > 0 ? formatTime(duration) : 'live'}
		</span>

		{#if hasVideo && playing && Math.abs(drift) > 0.1}
			<span class="num hidden shrink-0 text-[11px] text-faint sm:inline">
				sync {Math.abs(drift).toFixed(1)}s
			</span>
		{/if}

		<div class="flex items-center gap-1.5">
			<button class="icon-btn" onclick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
				{#if muted || volume === 0}
					<IconVolumeOff size={17} stroke={1.5} />
				{:else}
					<IconVolume size={17} stroke={1.5} />
				{/if}
			</button>

			<input
				type="range"
				class="seek hidden w-16 sm:inline-block cursor-pointer"
				min="0"
				max="100"
				step="1"
				value={muted ? 0 : volume}
				oninput={(e) => setVolume(Number(e.currentTarget.value))}
				aria-label="Volume"
				title="Volume: {muted ? 0 : volume}%"
			/>
		</div>
	</div>

	<!-- Ambient sound layer & Desk HUD trigger -->
	<div class="flex flex-wrap items-center justify-between gap-2 border-t border-cream/5 bg-night/50 px-4 py-2">
		<div class="flex items-center gap-1.5">
			<span class="num text-[11px] text-faint mr-1">Ambience:</span>
			<button
				type="button"
				class="rounded px-2 py-0.5 text-[11px] transition-colors {ambient.type === 'rain' && ambient.isPlaying ? 'bg-lamp/20 text-lamp font-medium' : 'text-faint hover:text-cream'}"
				onclick={() => ambient.setType('rain')}
				title="Rain against window"
			>
				<IconCloudRain size={12} stroke={1.5} class="inline mr-1" />
				Rain
			</button>
			<button
				type="button"
				class="rounded px-2 py-0.5 text-[11px] transition-colors {ambient.type === 'vinyl' && ambient.isPlaying ? 'bg-lamp/20 text-lamp font-medium' : 'text-faint hover:text-cream'}"
				onclick={() => ambient.setType('vinyl')}
				title="Vinyl needle crackle"
			>
				<IconDisc size={12} stroke={1.5} class="inline mr-1" />
				Vinyl
			</button>
			<button
				type="button"
				class="rounded px-2 py-0.5 text-[11px] transition-colors {ambient.type === 'tape' && ambient.isPlaying ? 'bg-lamp/20 text-lamp font-medium' : 'text-faint hover:text-cream'}"
				onclick={() => ambient.setType('tape')}
				title="Warm lo-fi tape hiss"
			>
				<IconWaveSine size={12} stroke={1.5} class="inline mr-1" />
				Tape
			</button>

			{#if ambient.isPlaying && ambient.type !== 'none'}
				<input
					type="range"
					min="0"
					max="100"
					value={ambient.volume}
					oninput={(e) => ambient.setVolume(Number(e.currentTarget.value))}
					class="seek w-14 ml-1 cursor-pointer"
					title="Ambience volume: {ambient.volume}%"
				/>
			{/if}
		</div>

		<button
			type="button"
			class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-taupe transition-colors hover:text-lamp hover:bg-lamp/10"
			onclick={() => (showDeskHud = true)}
			title="Fullscreen Desk HUD for second monitors"
		>
			<IconMaximize size={12} stroke={1.5} />
			<span>Desk HUD</span>
		</button>
	</div>
</div>

<DeskHud bind:open={showDeskHud} />
