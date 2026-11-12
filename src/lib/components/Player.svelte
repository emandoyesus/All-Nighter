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
	import IconMinimize from '@tabler/icons-svelte/icons/minimize';
	import IconTarget from '@tabler/icons-svelte/icons/target';
	import IconArrowsShuffle from '@tabler/icons-svelte/icons/arrows-shuffle';
	import IconShield from '@tabler/icons-svelte/icons/shield';

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
	let isMinimized = $state(false);
	let lastMode = $state<string | undefined>(undefined);

	$effect(() => {
		const currentMode = room.mode;
		if (currentMode !== lastMode) {
			lastMode = currentMode;
			if (currentMode === 'focus') {
				isMinimized = true;
			} else {
				isMinimized = false;
			}
		}
	});

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
		if (!unlocked) unlock();
		toggleMute();
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
			toggleMute();
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
	{#if room.mode === 'focus'}
		<!-- Focus Mode: Rolling CD View -->
		<div class="p-6 sm:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden bg-gradient-to-b from-night-2/80 via-night-3/60 to-night/90">
			<!-- Rolling CD Artwork -->
			<div class="relative my-2 sm:my-3 flex items-center justify-center">
				<!-- Outer Vinyl / CD Grooves -->
				<div
					class="relative h-44 w-44 sm:h-52 sm:w-52 rounded-full bg-[#0d0d0d] p-3 shadow-[0_15px_50px_rgba(0,0,0,0.85),inset_0_0_0_2px_rgba(255,255,255,0.08),inset_0_0_0_10px_rgba(20,20,20,0.9),inset_0_0_0_14px_rgba(255,255,255,0.04),inset_0_0_0_24px_rgba(10,10,10,0.95)] {playing ? 'animate-spin' : ''}"
					style="animation-duration: 7s; animation-timing-function: linear;"
				>
					<!-- Vinyl Sheen / Reflection lines -->
					<div class="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.08)_45deg,transparent_90deg,transparent_180deg,rgba(255,255,255,0.08)_225deg,transparent_270deg)] pointer-events-none"></div>

					<!-- Center Label with Album Art / Thumbnail -->
					<div class="relative h-full w-full rounded-full overflow-hidden border border-cream/20 bg-night-2 flex items-center justify-center">
						{#if room.state.videoId}
							<img
								src="https://img.youtube.com/vi/{room.state.videoId}/hqdefault.jpg"
								alt=""
								class="h-full w-full object-cover"
							/>
						{:else}
							<div class="grid h-full w-full place-items-center bg-night-3 text-lamp">
								<IconDisc size={40} stroke={1.5} />
							</div>
						{/if}
						<!-- Center Spindle Hole -->
						<div class="absolute inset-0 m-auto h-8 w-8 rounded-full border border-cream/30 bg-[#060a0b] shadow-inner flex items-center justify-center">
							<div class="h-2.5 w-2.5 rounded-full bg-cream/30"></div>
						</div>
					</div>
				</div>

				{#if playing && hasVideo}
					<div class="absolute -bottom-1 right-2">
						<AudioVisualizer active={playing} bars={4} size="sm" />
					</div>
				{/if}
			</div>

			<!-- Track Title & Artist -->
			<div class="mt-4 max-w-md w-full px-2">
				<span class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-300 mb-2">
					<IconTarget size={11} stroke={2} />
					Deep Focus Soundtrack
				</span>

				{#if room.state.current}
					<h2 class="text-base sm:text-lg font-semibold text-cream truncate" title={room.state.current.title}>
						{room.state.current.title}
					</h2>
					<p class="text-xs text-taupe truncate mt-1 flex items-center justify-center gap-1.5">
						<span>{room.state.current.channel ?? 'YouTube'}</span>
						<span class="text-faint/60">·</span>
						<span class="text-faint">added by</span>
						{#if room.state.current.addedBy === 'Autoplay' || room.state.current.addedBy === 'YouTube Autoplay'}
							<span class="text-amber-300 font-medium">Autoplay</span>
						{:else}
							<button
								type="button"
								class="text-cream/90 hover:text-lamp transition-colors underline decoration-cream/20 underline-offset-2 cursor-pointer"
								onclick={() => room.state.current?.addedBy && window.dispatchEvent(new CustomEvent('an:inspect-peer', { detail: { name: room.state.current.addedBy } }))}
							>
								{room.state.current.addedBy}
							</button>
						{/if}
					</p>
				{:else}
					<p class="text-sm text-taupe font-mono">The night is quiet.</p>
				{/if}

				<button
					type="button"
					class="btn btn-ghost btn-sm text-xs mt-3.5 text-amber-300 hover:text-cream border border-amber-400/30 hover:border-amber-400/60 inline-flex items-center gap-1.5 transition-colors"
					onclick={() => window.dispatchEvent(new CustomEvent('an:open-desk-hud'))}
					title="Open Fullscreen Focus HUD"
				>
					<IconMaximize size={13} stroke={1.5} />
					<span>Fullscreen Focus HUD</span>
				</button>
			</div>

			{#if ready && !unlocked}
				<div class="mt-4 flex items-center gap-2">
					<button class="btn btn-primary btn-sm text-xs py-1.5 px-4" onclick={unlock}>
						<IconVolume size={15} stroke={1.5} />
						Turn on audio
					</button>
				</div>
			{/if}
		</div>
	{:else if isMinimized}
		<!-- Minimal HUD-Style Now Playing Bar -->
		<div class="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-night-2 via-night-3 to-night-2 border-b border-cream/10">
			<div class="flex items-center gap-3.5 min-w-0 flex-1">
				<div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-cream/15 bg-night flex items-center justify-center shadow-md">
					{#if room.state.videoId}
						<img
							src="https://img.youtube.com/vi/{room.state.videoId}/hqdefault.jpg"
							alt=""
							class="h-full w-full object-cover"
						/>
					{:else}
						<div class="grid h-full w-full place-items-center text-lamp">
							<IconDisc size={22} stroke={1.5} class={playing ? 'animate-spin' : ''} style="animation-duration: 6s;" />
						</div>
					{/if}
					{#if playing && hasVideo}
						<div class="absolute inset-0 bg-night/60 flex items-center justify-center backdrop-blur-[1px]">
							<AudioVisualizer active={playing} bars={3} size="sm" />
						</div>
					{/if}
				</div>

				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2 mb-0.5">
						<span class="text-[10px] font-mono text-faint uppercase tracking-wider">Now Playing</span>
					</div>
					{#if room.state.current}
						<p class="truncate text-sm font-semibold text-cream" title={room.state.current.title}>
							{room.state.current.title}
						</p>
						<p class="truncate text-xs text-taupe flex items-center gap-1.5 mt-0.5">
							<span>{room.state.current.channel ?? 'YouTube'}</span>
							<span class="text-faint/60">·</span>
							<span class="text-faint">added by</span>
							{#if room.state.current.addedBy === 'Autoplay' || room.state.current.addedBy === 'YouTube Autoplay'}
								<span class="text-amber-300 font-medium">Autoplay</span>
							{:else}
								<button
									type="button"
									class="text-cream/90 hover:text-lamp transition-colors underline decoration-cream/20 underline-offset-2 cursor-pointer"
									onclick={() => room.state.current?.addedBy && window.dispatchEvent(new CustomEvent('an:inspect-peer', { detail: { name: room.state.current.addedBy } }))}
								>
									{room.state.current.addedBy}
								</button>
							{/if}
						</p>
					{:else}
						<p class="text-xs text-taupe">The room is quiet. Add a track to queue.</p>
					{/if}
				</div>
			</div>

			<div class="flex items-center gap-2 shrink-0">
				{#if ready && !unlocked}
					<button class="btn btn-primary btn-sm text-xs py-1 px-3" onclick={unlock}>
						<IconVolume size={14} stroke={1.5} />
						Turn on
					</button>
				{/if}
				<button
					type="button"
					class="btn btn-ghost btn-sm text-xs py-1 px-2.5 text-taupe hover:text-cream flex items-center gap-1.5 border border-cream/10 hover:border-cream/25 transition-colors"
					onclick={() => (isMinimized = false)}
					title="Expand full video player"
				>
					<IconMaximize size={13} stroke={1.5} />
					<span class="hidden sm:inline">Expand video</span>
				</button>
			</div>
		</div>
	{:else}
		<!-- Full Video Player Header -->
		<div class="flex items-center justify-between gap-3 border-b border-cream/10 px-4 py-3">
			<div class="min-w-0 flex-1">
				{#if room.state.current}
					<p class="truncate text-sm font-medium" title={room.state.current.title}>{room.state.current.title}</p>
					<p class="truncate text-xs text-faint flex items-center gap-1.5">
						<span class="truncate">{room.state.current.channel ?? 'YouTube'}</span>
						<span class="text-faint/70 shrink-0">·</span>
						<span class="inline-flex items-center gap-1 truncate">
							<span class="text-faint shrink-0">added by</span>
							{#if room.state.current.addedBy === 'Autoplay' || room.state.current.addedBy === 'YouTube Autoplay'}
								<span class="truncate font-medium text-amber-300">Autoplay</span>
							{:else}
								<button
									type="button"
									class="truncate font-medium text-cream/90 transition-colors hover:text-lamp underline decoration-cream/20 underline-offset-2 cursor-pointer text-left"
									onclick={() => room.state.current?.addedBy && window.dispatchEvent(new CustomEvent('an:inspect-peer', { detail: { name: room.state.current.addedBy } }))}
									title="View {room.state.current.addedBy}'s nocturnal profile"
								>
									{room.state.current.addedBy}
								</button>
							{/if}
						</span>
					</p>
				{:else}
					<p class="text-sm text-taupe">Nothing on right now</p>
				{/if}
			</div>
			<div class="flex items-center gap-2 shrink-0">
				{#if room.state.adminOnlyPlayback}
					<span class="inline-flex items-center gap-1 rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] text-aqua-foam font-mono border border-teal-500/30" title="Aux controls restricted to room admins">
						<IconShield size={10} stroke={2} />
						Aux: Admin
					</span>
				{:else}
					<span class="inline-flex items-center gap-1 rounded bg-cream/8 px-1.5 py-0.5 text-[10px] text-taupe font-mono border border-cream/15" title="Aux is open to everyone (No Admin)">
						Aux: No Admin
					</span>
				{/if}
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
				<button
					type="button"
					class="icon-btn text-taupe hover:text-cream transition-colors ml-0.5"
					onclick={() => (isMinimized = true)}
					title="Minimize video player"
					aria-label="Minimize video player"
				>
					<IconMinimize size={15} stroke={1.5} />
				</button>
			</div>
		</div>
	{/if}

	<!-- Video mount target for persistent GlobalPlayer -->
	<div
		id="room-video-viewport"
		data-video-viewport="true"
		data-minimized={isMinimized || room.mode === 'focus'}
		class="relative bg-night overflow-hidden transition-all duration-300 {isMinimized || room.mode === 'focus' ? 'h-0 opacity-0 pointer-events-none' : 'aspect-video'}"
	>
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
					<h3 class="mt-4 text-base sm:text-lg font-medium flex items-center justify-center gap-2 max-w-full px-4">
						<span class="truncate" title={room.state.current.title}>{room.state.current.title}</span>
						{#if room.state.current.isPlaylist}
							<span class="shrink-0 rounded bg-lamp/15 px-2 py-0.5 text-[10px] font-mono uppercase text-lamp tracking-wider">Playlist</span>
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
		{:else if !room.state.playing}
			<div class="absolute inset-0 z-30 grid place-items-center bg-night/85 backdrop-blur-[2px] px-6 text-center">
				<div class="max-w-[380px] p-4 flex flex-col items-center">
					<span class="grid h-12 w-12 place-items-center rounded-full bg-amber/15 text-amber ring-1 ring-amber/30 mb-3 shadow-lg">
						<IconPlay size={22} stroke={1.8} class="translate-x-0.5" />
					</span>
					<h4 class="text-base font-medium text-cream">{room.state.current?.title || 'Starting Track Ready'}</h4>
					<p class="text-xs text-taupe mt-1 mb-4 leading-relaxed">
						{#if room.isAutoplayPaused}
							Autoplay paused after 30 minutes of continuous listening. Anyone can resume the player!
						{:else if room.isHost}
							You are the host. Start the player when you're ready to begin the session.
						{:else}
							Waiting for the host ({room.hostName() || 'Host'}) to start the player.
						{/if}
					</p>
					{#if room.isHost || room.isAutoplayPaused}
						<button
							type="button"
							class="btn btn-amber btn-sm px-5 py-2 text-xs font-mono flex items-center gap-2 cursor-pointer shadow-lg hover:scale-105 transition-all"
							onclick={() => window.dispatchEvent(new CustomEvent('an:player:toggle'))}
						>
							<IconPlay size={15} stroke={2} />
							<span>{room.isAutoplayPaused ? 'Resume Music' : 'Start Player'}</span>
						</button>
					{/if}
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

	<div class="border-t border-cream/10 px-3.5 sm:px-4 py-2.5 sm:py-3 relative z-30 flex flex-col gap-2">
		<!-- Seek slider and track times row (full width on mobile and desktop) -->
		<div class="flex items-center gap-2 sm:gap-2.5 w-full">
			<span class="num w-10 shrink-0 text-right text-xs text-taupe font-mono">{formatTime(localTime)}</span>

			<input
				type="range"
				class="seek min-w-0 flex-1 {room.canControlPlayback ? '' : 'opacity-40 cursor-not-allowed'}"
				min="0"
				max={duration > 0 ? duration : 100}
				step="1"
				value={duration > 0 ? Math.min(localTime, duration) : 0}
				oninput={scrub}
				disabled={!hasVideo || duration <= 0 || !room.canControlPlayback}
				aria-label="Seek within the track"
				title={!room.canControlPlayback ? 'Aux is locked to room admins' : 'Seek track'}
			/>

			<span class="num w-10 shrink-0 text-xs text-faint font-mono">
				{duration > 0 ? formatTime(duration) : 'live'}
			</span>
		</div>

		<!-- Playback buttons row -->
		<div class="flex items-center justify-between gap-2">
			<div class="flex items-center gap-1.5 sm:gap-3">
				<button
					class="icon-btn"
					onclick={toggle}
					disabled={!hasVideo && !playing}
					aria-label={muted || volume === 0 ? 'Unmute audio' : 'Mute audio'}
					title={muted || volume === 0 ? 'Click to unmute (Space)' : 'Click to mute (Space)'}
				>
					{#if muted || volume === 0}
						<IconVolumeOff size={18} stroke={1.5} />
					{:else}
						<IconVolume size={18} stroke={1.5} class="text-lamp" />
					{/if}
				</button>

				<button
					class="icon-btn"
					onclick={skip}
					disabled={queued === 0 || !room.canSkip}
					aria-label="Skip to the next track"
					title={!room.canSkip ? 'Aux is set to Admin only' : (room.isHost ? 'Host skip' : (room.isAdminUser ? 'Admin skip' : 'Skip track'))}
				>
					<IconSkip size={18} stroke={1.5} />
				</button>

				{#if room.isAdminUser}
					<button
						class="icon-btn"
						onclick={() => room.shuffleQueue()}
						disabled={queued <= 1}
						aria-label="Shuffle playlist"
						title={queued <= 1 ? 'Need at least 2 tracks to shuffle' : 'Shuffle playlist (Admin)'}
					>
						<IconArrowsShuffle size={17} stroke={1.5} />
					</button>
				{/if}

				<!-- Admin / Exceptional Autoplay Resume Play/Pause -->
				{#if room.canControlPlayback || room.isAutoplayPaused}
					<button
						class="icon-btn {room.state.playing ? 'text-taupe hover:text-amber' : 'text-amber bg-amber/15 border border-amber/30 animate-pulse'}"
						onclick={() => {
							if (room.state.playing) {
								window.dispatchEvent(new CustomEvent('an:open-global-pause-modal'));
							} else {
								window.dispatchEvent(new CustomEvent('an:player:toggle'));
							}
						}}
						aria-label={room.state.playing ? 'Pause for everyone' : 'Resume for everyone'}
						title={room.state.playing ? 'Pause music for everyone (Admin confirmation)' : (room.isAutoplayPaused ? 'Resume autoplay for everyone' : (room.isHost ? 'Start/Resume music for everyone' : 'Waiting for host to start'))}
					>
						{#if room.state.playing}
							<IconPause size={17} stroke={1.5} />
						{:else}
							<IconPlay size={17} stroke={1.5} />
						{/if}
					</button>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				{#if hasVideo && playing && Math.abs(drift) > 0.1}
					<span class="num hidden shrink-0 text-[11px] text-faint sm:inline font-mono">
						sync {Math.abs(drift).toFixed(1)}s
					</span>
				{/if}

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
