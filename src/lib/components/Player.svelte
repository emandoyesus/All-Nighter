<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import { DRIFT_TOLERANCE, HEARTBEAT_TICK } from '#lib/config';
	import { loadYouTubeApi, formatTime } from '#lib/room/youtube';
	import IconPlay from '@tabler/icons-svelte/icons/player-play';
	import IconPause from '@tabler/icons-svelte/icons/player-pause';
	import IconSkip from '@tabler/icons-svelte/icons/player-skip-forward';
	import IconVolume from '@tabler/icons-svelte/icons/volume';
	import IconVolumeOff from '@tabler/icons-svelte/icons/volume-off';
	import IconMusic from '@tabler/icons-svelte/icons/music';

	const ENDED = 0;
	const PLAYING = 1;
	const PAUSED = 2;

	let frame: HTMLDivElement;
	let player: any = null;
	let ready = $state(false);
	let unlocked = $state(false);
	let playerState = $state(-1);
	let localTime = $state(0);
	let duration = $state(0);
	let drift = $state(0);
	let muted = $state(true);
	let apiError = $state(false);

	const hasVideo = $derived(!!room.state.videoId);
	const playing = $derived(room.state.playing);
	const queued = $derived(room.state.queue.length);

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
		drift = target - actual;
		if (Math.abs(drift) > DRIFT_TOLERANCE) player.seekTo(target, true);

		if (s.playing && playerState !== PLAYING) player.playVideo();
		else if (!s.playing && playerState === PLAYING) player.pauseVideo();
	}

	function unlock(): void {
		unlocked = true;
		if (!ready || !player) return;
		try {
			player.unMute();
			player.setVolume(80);
			muted = false;
			if (room.state.playing || room.state.videoId) player.playVideo();
		} catch {
			/* player still settling */
		}
		applyToPlayer();
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
		if (muted) {
			player.unMute();
			muted = false;
			unlocked = true;
		} else {
			player.mute();
			muted = true;
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
		}, 500);

		const beat = window.setInterval(() => {
			if (ready && room.isDirector() && room.state.playing && player?.getCurrentTime) {
				room.heartbeat(player.getCurrentTime());
			}
		}, HEARTBEAT_TICK);

		return () => {
			alive = false;
			window.clearInterval(tick);
			window.clearInterval(beat);
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
			<div class="flex h-4 shrink-0 items-end gap-[3px]" aria-hidden="true">
				{#each [0, 1, 2] as i}
					<span
						class="eq-bar h-full w-[3px] rounded-full bg-lamp"
						style="animation-delay: {i * 0.18}s"
					></span>
				{/each}
			</div>
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
		{:else if !hasVideo}
			<div class="absolute inset-0 grid place-items-center bg-night-3 px-8 text-center">
				<div>
					<span
						class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-lamp/12 text-lamp ring-1 ring-lamp/25"
					>
						<IconMusic size={22} stroke={1.5} />
					</span>
					<h3 class="mt-4 text-lg font-medium">The room is quiet</h3>
					<p class="mx-auto mt-1.5 max-w-[38ch] text-sm leading-relaxed text-taupe">
						Paste a YouTube link into the queue, or start one of the crate's radios below.
					</p>
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
			disabled={queued === 0}
			aria-label="Skip to the next track"
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

		<button class="icon-btn" onclick={toggleMute} disabled={!ready} aria-label={muted ? 'Unmute' : 'Mute'}>
			{#if muted}
				<IconVolumeOff size={17} stroke={1.5} />
			{:else}
				<IconVolume size={17} stroke={1.5} />
			{/if}
		</button>
	</div>
</div>
