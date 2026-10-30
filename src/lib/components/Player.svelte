<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import { DRIFT_TOLERANCE, HEARTBEAT_TICK } from '#lib/config';
	import { loadYouTubeApi, formatTime } from '#lib/room/youtube';
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

	const ENDED = 0;
	const PLAYING = 1;
	const PAUSED = 2;

	let frame: HTMLDivElement;
	let player: any = null;
	let ready = $state(false);
	const LS_VOLUME = 'an.volume';
	function loadSavedVolume(): number {
		try {
			const saved = localStorage.getItem(LS_VOLUME);
			if (saved !== null) {
				const n = Number(saved);
				if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
			}
		} catch {}
		return 80;
	}

	let volume = $state(loadSavedVolume());
	let unlocked = $state(false);
	let playerState = $state(-1);
	let localTime = $state(0);
	let duration = $state(0);
	let drift = $state(0);
	let muted = $state(true);
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

	/** Where the shared timeline says we should be right now. */
	function targetTime(): number {
		const s = room.state;
		if (!s.playing) return s.position;
		return s.position + (Date.now() + room.offset - s.clock) / 1000;
	}

	function applyToPlayer(): void {
		if (!ready || !player?.getVideoData) return;
		const s = room.state;
		const currentId = player.getVideoData()?.video_id ?? null;

		if (!s.videoId) {
			if (currentId) player.stopVideo();
			return;
		}

		if (currentId !== s.videoId) {
			player.loadVideoById({ videoId: s.videoId, startSeconds: Math.max(0, targetTime()) });
			if (!unlocked) player.mute();
			return;
		}

		const target = targetTime();
		const actual = player.getCurrentTime() ?? 0;
		const curDrift = target - actual;
		drift = curDrift;
		if (Math.abs(curDrift) > DRIFT_TOLERANCE) player.seekTo(target, true);

		if (s.playing && playerState !== PLAYING) player.playVideo();
		else if (!s.playing && playerState === PLAYING) player.pauseVideo();
	}

	function unlock(): void {
		unlocked = true;
		if (!ready || !player) return;
		try {
			player.unMute();
			player.setVolume(volume);
			muted = volume === 0;
			if (room.state.playing || room.state.videoId) player.playVideo();
		} catch {
			/* player still settling */
		}
		applyToPlayer();
	}

	function setVolume(val: number): void {
		volume = Math.max(0, Math.min(100, Math.round(val)));
		try {
			localStorage.setItem(LS_VOLUME, String(volume));
		} catch {}
		if (!ready || !player) return;
		try {
			player.setVolume(volume);
			if (volume === 0) {
				player.mute();
				muted = true;
			} else if (muted) {
				player.unMute();
				muted = false;
				unlocked = true;
			}
		} catch {}
	}

	function toggle(): void {
		if (!hasVideo || !ready) return;
		room.toggle(player.getCurrentTime?.() ?? room.state.position);
		applyToPlayer();
	}

	function skip(): void {
		room.skip();
		applyToPlayer();
	}

	function scrub(e: Event): void {
		const value = Number((e.currentTarget as HTMLInputElement).value);
		localTime = value;
		room.seekTo(value);
		if (ready && player?.seekTo) player.seekTo(value, true);
	}

	function toggleMute(): void {
		if (!ready || !player) return;
		if (muted || volume === 0) {
			const restore = volume > 0 ? volume : 80;
			setVolume(restore);
			player.unMute();
			muted = false;
			unlocked = true;
		} else {
			player.mute();
			muted = true;
		}
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
		let alive = true;

		loadYouTubeApi()
			.then((YT) => {
				if (!alive || !frame) return;
				player = new YT.Player(frame, {
					width: '100%',
					height: '100%',
					playerVars: {
						controls: 0,
						rel: 0,
						playsinline: 1,
						modestbranding: 1,
						disablekb: 1,
						iv_load_policy: 3,
						origin: location.origin
					},
					events: {
						onReady: () => {
							ready = true;
							duration = player.getDuration?.() ?? 0;
							if (!unlocked) player.mute();
							else player.setVolume(volume);
							applyToPlayer();
						},
						onStateChange: (e: { data: number }) => {
							playerState = e.data;
							if (e.data === PLAYING) {
								duration = player.getDuration?.() ?? 0;
								muted = player.isMuted?.() ?? muted;
							}
							if (e.data === ENDED && room.state.playing) {
								room.ended(room.state.videoId);
							}
						},
						onError: () => {
							/* blocked or removed video: let the crew skip past it */
						}
					}
				});
			})
			.catch(() => {
				if (alive) apiError = true;
			});

		const tick = window.setInterval(() => {
			if (!ready || !player?.getCurrentTime) return;

			// If the last director vanished mid-track, take the wheel so sync keeps working.
			if (
				room.state.playing &&
				!room.isDirector() &&
				room.lastRemoteAt &&
				Date.now() - room.lastRemoteAt > 30_000
			) {
				room.claim(player.getCurrentTime());
			}

			applyToPlayer();
			localTime = player.getCurrentTime() ?? 0;
			duration = player.getDuration?.() ?? 0;

			window.dispatchEvent(
				new CustomEvent('an:player:status', {
					detail: {
						localTime,
						duration,
						volume,
						muted
					}
				})
			);
		}, 500);

		const onVolumeEvent = (e: Event) => {
			const custom = e as CustomEvent<number>;
			if (typeof custom.detail === 'number') setVolume(custom.detail);
		};
		const onMuteToggleEvent = () => toggleMute();
		const onSkipEvent = () => skip();
		const onToggleEvent = () => toggle();
		const onOpenDeskHud = () => (showDeskHud = true);

		window.addEventListener('an:player:set-volume', onVolumeEvent);
		window.addEventListener('an:player:toggle-mute', onMuteToggleEvent);
		window.addEventListener('an:player:skip', onSkipEvent);
		window.addEventListener('an:player:toggle', onToggleEvent);
		window.addEventListener('an:open-desk-hud', onOpenDeskHud);

		const beat = window.setInterval(() => {
			if (ready && room.isDirector() && room.state.playing && player?.getCurrentTime) {
				room.heartbeat(player.getCurrentTime());
			}
		}, HEARTBEAT_TICK);

		return () => {
			alive = false;
			window.clearInterval(tick);
			window.clearInterval(beat);
			window.removeEventListener('an:player:set-volume', onVolumeEvent);
			window.removeEventListener('an:player:toggle-mute', onMuteToggleEvent);
			window.removeEventListener('an:player:skip', onSkipEvent);
			window.removeEventListener('an:player:toggle', onToggleEvent);
			window.removeEventListener('an:open-desk-hud', onOpenDeskHud);
			try {
				player?.destroy();
			} catch {
				/* already gone */
			}
		};
	});

	// React to any shared-state change immediately, not on the next tick.
	$effect(() => {
		room.state.seq;
		room.state.videoId;
		room.state.playing;
		if (ready) applyToPlayer();
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

	<div class="relative aspect-video bg-night">
		<div class="absolute inset-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:h-full [&>iframe]:w-full">
			<div bind:this={frame}></div>
		</div>

		{#if apiError}
			<div class="absolute inset-0 grid place-items-center bg-night-3 px-8 text-center">
				<p class="max-w-[36ch] text-sm text-taupe">
					The player could not load. Check your network, the queue is still here.
				</p>
			</div>
		{:else if externalOnly && room.state.current}
			<div class="absolute inset-0 grid place-items-center bg-night-3 px-8 text-center">
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
			<div class="absolute inset-0 flex flex-col items-center justify-center bg-night-3 px-6 text-center">
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
			<div class="absolute inset-0 grid place-items-center bg-night/80 backdrop-blur-[2px] px-8 text-center">
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
			disabled={!hasVideo || !ready}
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
			disabled={!hasVideo || !ready || duration <= 0}
			aria-label="Seek within the track"
		/>

		<span class="num w-11 shrink-0 text-xs text-faint">
			{duration > 0 ? formatTime(duration) : 'live'}
		</span>

		{#if hasVideo && playing && ready && Math.abs(drift) > 0.1}
			<span class="num hidden shrink-0 text-[11px] text-faint sm:inline">
				sync {Math.abs(drift).toFixed(1)}s
			</span>
		{/if}

		<div class="flex items-center gap-1.5">
			<button class="icon-btn" onclick={toggleMute} disabled={!ready} aria-label={muted ? 'Unmute' : 'Mute'}>
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
				disabled={!ready}
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
