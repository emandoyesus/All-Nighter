<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { room } from '#lib/room/room.svelte';
	import { DRIFT_TOLERANCE, HEARTBEAT_TICK } from '#lib/config';
	import { loadYouTubeApi } from '#lib/room/youtube';

	const ENDED = 0;
	const PLAYING = 1;
	const PAUSED = 2;

	let containerEl: HTMLDivElement;
	let frameEl: HTMLDivElement;
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
			else player.setVolume(volume);
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
			/* settling */
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

	function togglePlay(): void {
		if (!room.state.videoId || !ready) return;
		room.toggle(player?.getCurrentTime?.() ?? room.state.position);
		applyToPlayer();
	}

	function skip(): void {
		room.skip();
		applyToPlayer();
	}

	function seek(time: number): void {
		localTime = time;
		room.seekTo(time);
		if (ready && player?.seekTo) player.seekTo(time, true);
	}

	let ro: ResizeObserver | null = null;
	let observedViewport: HTMLElement | null = null;

	function syncViewportPosition(): void {
		if (typeof document === 'undefined' || !containerEl) return;
		const viewport = document.getElementById('room-video-viewport');
		const inActiveRoom = room.joinState === 'approved';
		const hasVideo = !!room.state.videoId;

		if (!viewport || !inActiveRoom || !hasVideo) {
			// Persistent audio mode: keep iframe playing in background with safe dimensions
			containerEl.style.position = 'fixed';
			containerEl.style.top = '-9999px';
			containerEl.style.left = '-9999px';
			containerEl.style.width = '320px';
			containerEl.style.height = '180px';
			containerEl.style.opacity = '0.001';
			containerEl.style.pointerEvents = 'none';
			containerEl.style.zIndex = '-1';
			return;
		}

		const rect = viewport.getBoundingClientRect();
		const scrollY = window.scrollY;
		const scrollX = window.scrollX;

		containerEl.style.position = 'absolute';
		containerEl.style.top = `${rect.top + scrollY}px`;
		containerEl.style.left = `${rect.left + scrollX}px`;
		containerEl.style.width = `${rect.width}px`;
		containerEl.style.height = `${rect.height}px`;
		containerEl.style.opacity = '1';
		containerEl.style.pointerEvents = 'auto';
		containerEl.style.zIndex = '20';
		containerEl.style.borderRadius = 'var(--radius-card, 14px) var(--radius-card, 14px) 0 0';
	}

	function checkObserver(): void {
		if (typeof document === 'undefined') return;
		const viewport = document.getElementById('room-video-viewport');
		if (viewport !== observedViewport) {
			if (ro && observedViewport) ro.unobserve(observedViewport);
			observedViewport = viewport;
			if (viewport) {
				if (!ro) ro = new ResizeObserver(() => syncViewportPosition());
				ro.observe(viewport);
			}
		}
		syncViewportPosition();
	}

	onMount(() => {
		let alive = true;

		loadYouTubeApi()
			.then((YT) => {
				if (!alive || !frameEl) return;
				player = new YT.Player(frameEl, {
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
							checkObserver();
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
							if (alive) apiError = true;
						}
					}
				});
			})
			.catch(() => {
				if (alive) apiError = true;
			});

		const tickInterval = window.setInterval(() => {
			if (!ready || !player?.getCurrentTime) return;

			// If last director vanished mid-track, claim director wheel
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
						muted,
						ready,
						unlocked,
						apiError,
						drift
					}
				})
			);

			// Check layout alignment in room
			if (document.getElementById('room-video-viewport')) {
				syncViewportPosition();
			}
		}, 500);

		const onVolumeEvent = (e: Event) => {
			const custom = e as CustomEvent<number>;
			if (typeof custom.detail === 'number') setVolume(custom.detail);
		};
		const onMuteToggleEvent = () => toggleMute();
		const onSkipEvent = () => skip();
		const onToggleEvent = () => togglePlay();
		const onSeekEvent = (e: Event) => {
			const custom = e as CustomEvent<number>;
			if (typeof custom.detail === 'number') seek(custom.detail);
		};
		const onUnlockEvent = () => unlock();
		const onWindowResize = () => syncViewportPosition();

		window.addEventListener('an:player:set-volume', onVolumeEvent);
		window.addEventListener('an:player:toggle-mute', onMuteToggleEvent);
		window.addEventListener('an:player:skip', onSkipEvent);
		window.addEventListener('an:player:toggle', onToggleEvent);
		window.addEventListener('an:player:seek', onSeekEvent);
		window.addEventListener('an:player:unlock', onUnlockEvent);
		window.addEventListener('resize', onWindowResize);

		const beat = window.setInterval(() => {
			if (ready && room.isDirector() && room.state.playing && player?.getCurrentTime) {
				room.heartbeat(player.getCurrentTime());
			}
		}, HEARTBEAT_TICK);

		return () => {
			alive = false;
			window.clearInterval(tickInterval);
			window.clearInterval(beat);
			if (ro) ro.disconnect();
			window.removeEventListener('an:player:set-volume', onVolumeEvent);
			window.removeEventListener('an:player:toggle-mute', onMuteToggleEvent);
			window.removeEventListener('an:player:skip', onSkipEvent);
			window.removeEventListener('an:player:toggle', onToggleEvent);
			window.removeEventListener('an:player:seek', onSeekEvent);
			window.removeEventListener('an:player:unlock', onUnlockEvent);
			window.removeEventListener('resize', onWindowResize);
			try {
				player?.destroy();
			} catch {}
		};
	});

	afterNavigate(() => {
		requestAnimationFrame(async () => {
			await tick();
			checkObserver();
		});
	});

	$effect(() => {
		room.state.seq;
		room.state.videoId;
		room.state.playing;
		room.joinState;
		if (ready) {
			applyToPlayer();
			checkObserver();
		}
	});
</script>

<div
	bind:this={containerEl}
	class="overflow-hidden bg-night shadow-2xl transition-[opacity] duration-200"
	style="position: fixed; top: -9999px; left: -9999px; width: 320px; height: 180px; opacity: 0.001; pointer-events: none; z-index: -1;"
	aria-hidden={room.joinState !== 'approved'}
>
	<div
		class="relative h-full w-full [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:h-full [&>iframe]:w-full"
	>
		<div bind:this={frameEl}></div>
	</div>
</div>
