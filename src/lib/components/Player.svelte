<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import { formatTime } from '#lib/room/youtube';
	import { siteAudio } from '#lib/audio/site-audio.svelte';
	import AudioVisualizer from './AudioVisualizer.svelte';
	import IconPlay from '@tabler/icons-svelte/icons/player-play';
	import IconPause from '@tabler/icons-svelte/icons/player-pause';
	import IconSkip from '@tabler/icons-svelte/icons/player-skip-forward';
	import IconVolume from '@tabler/icons-svelte/icons/volume';
	import IconVolumeOff from '@tabler/icons-svelte/icons/volume-off';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconExternal from '@tabler/icons-svelte/icons/external-link';
	import IconDisc from '@tabler/icons-svelte/icons/disc';
	import IconMaximize from '@tabler/icons-svelte/icons/maximize';

	const LS_VOLUME = 'an.volume';

	function loadSavedVolume(): number {
		if (typeof window === 'undefined') return 80;
		try {
			const saved = localStorage.getItem(LS_VOLUME);
			if (saved !== null) {
				const n = Number(saved);
				if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
			}
		} catch {}
		return 80;
	}

	let ready = $state(false);
	let unlocked = $state(false);
	let localTime = $state(0);
	let duration = $state(0);
	let drift = $state(0);
	let volume = $state(80);
	let muted = $state(false);
	let apiError = $state(false);

	const hasVideo = $derived(
		!!room.state.videoId ||
		(room.state.source === 'youtube' && (!!room.state.playlistId || !!room.state.current?.playlistId))
	);
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

	function unlock(): void {
		unlocked = true;
		window.dispatchEvent(new CustomEvent('an:player:unlock'));
	}

	function setVolume(val: number): void {
		volume = Math.max(0, Math.min(100, Math.round(val)));
		muted = volume === 0;
		try {
			localStorage.setItem(LS_VOLUME, String(volume));
		} catch {}
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
		volume = loadSavedVolume();
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

		window.addEventListener('an:player:status', onStatus);

		return () => {
			window.removeEventListener('an:player:status', onStatus);
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
		<div class="flex items-center gap-2 shrink-0">
			{#if room.state.isPrivate}
				<span class="inline-flex items-center gap-1 rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300 font-mono border border-amber-400/30">
					Private
				</span>
			{:else}
				<span class="inline-flex items-center gap-1 rounded bg-lamp/10 px-1.5 py-0.5 text-[10px] text-lamp font-mono border border-lamp/30">
					Public
				</span>
			{/if}
			{#if playing && hasVideo}
				<AudioVisualizer active={playing} bars={5} size="sm" class="shrink-0" />
			{/if}
		</div>
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
					<h3 class="mt-4 text-lg font-medium flex items-center justify-center gap-2">
						<span>{room.state.current.title}</span>
						{#if room.state.current.isPlaylist}
							<span class="rounded bg-lamp/15 px-2 py-0.5 text-[10px] font-mono uppercase text-lamp tracking-wider">Playlist</span>
						{/if}
					</h3>
					<p class="mx-auto mt-1.5 max-w-[40ch] text-sm leading-relaxed text-taupe">
						This {room.state.current.isPlaylist ? 'playlist' : 'track'} lives on {sourceLabel(room.state.source)}. Open it there to listen along — the
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
						Paste any link into the queue below to play for everyone.
					</p>
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

	<div class="flex items-center gap-3 border-t border-cream/10 px-4 py-3 relative z-30">
		<button
			class="icon-btn"
			onclick={toggle}
			disabled={!hasVideo && !playing}
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
				class="rounded px-2.5 py-0.5 text-[11px] transition-colors inline-flex items-center gap-1.5 {siteAudio.isPlaying ? 'bg-lamp/20 text-lamp font-medium border border-lamp/30' : 'text-faint hover:text-cream border border-transparent'}"
				onclick={() => siteAudio.toggle()}
				title={siteAudio.isPlaying ? 'Mute Interstellar soundtrack' : 'Play Interstellar soundtrack'}
			>
				{#if siteAudio.isPlaying}
					<span class="inline-flex items-end gap-[2px] h-2.5 w-2.5" aria-hidden="true">
						<span class="eq-bar w-[2px] h-full bg-lamp rounded-full" style="animation-delay: 0s;"></span>
						<span class="eq-bar w-[2px] h-full bg-lamp rounded-full" style="animation-delay: 0.25s;"></span>
						<span class="eq-bar w-[2px] h-full bg-lamp rounded-full" style="animation-delay: 0.5s;"></span>
					</span>
				{:else}
					<IconDisc size={12} stroke={1.5} />
				{/if}
				Interstellar
			</button>
		</div>

		<button
			type="button"
			class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-taupe transition-colors hover:text-lamp hover:bg-lamp/10"
			onclick={() => window.dispatchEvent(new CustomEvent('an:open-desk-hud'))}
			title="Fullscreen Desk HUD for second monitors"
		>
			<IconMaximize size={12} stroke={1.5} />
			<span>Desk HUD</span>
		</button>
	</div>
</div>
