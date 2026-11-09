<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { room } from '#lib/room/room.svelte';
	import { DRIFT_TOLERANCE, HEARTBEAT_TICK } from '#lib/config';
	import { loadYouTubeApi } from '#lib/room/youtube';
	import IconVolume from '@tabler/icons-svelte/icons/volume';
	import IconVolumeOff from '@tabler/icons-svelte/icons/volume-off';

	const ENDED = 0;
	const PLAYING = 1;
	const PAUSED = 2;

	let containerEl: HTMLDivElement;
	let frameEl: HTMLDivElement;
	let player: any = null;
	let ready = $state(false);
	let loadedVideoId: string | null = null;
	let loadedPlaylistId: string | null = null;

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
		// If we are the director who published this state, s.clock was generated locally: no network offset
		const isSelf = s.by === room.clientId;
		const elapsed = isSelf
			? (Date.now() - s.clock) / 1000
			: (Date.now() + room.offset - s.clock) / 1000;
		return s.position + Math.max(0, elapsed);
	}

	function applyToPlayer(): void {
		if (!ready || !player) return;
		if (room.joinState !== 'approved') {
			try {
				player.stopVideo?.();
			} catch {}
			loadedVideoId = null;
			loadedPlaylistId = null;
			return;
		}
		const s = room.state;

		if (!s.videoId && !s.playlistId && !s.current?.playlistId) {
			if (loadedVideoId || loadedPlaylistId) {
				try {
					player.stopVideo?.();
				} catch {}
				loadedVideoId = null;
				loadedPlaylistId = null;
			}
			return;
		}

		const targetPlaylist = s.playlistId || s.current?.playlistId || null;
		const videoChanged = (s.videoId ?? null) !== loadedVideoId;
		const playlistChanged = targetPlaylist !== loadedPlaylistId;

		if (videoChanged || playlistChanged) {
			loadedVideoId = s.videoId ?? null;
			loadedPlaylistId = targetPlaylist;

			if (!unlocked) {
				try {
					player.mute?.();
				} catch {}
			} else {
				try {
					player.unMute?.();
					player.setVolume?.(volume);
				} catch {}
			}

			if (targetPlaylist && !s.videoId) {
				try {
					if (s.playing) {
						player.loadPlaylist?.({
							list: targetPlaylist,
							listType: 'playlist',
							index: 0,
							startSeconds: Math.max(0, targetTime())
						});
					} else {
						player.cuePlaylist?.({
							list: targetPlaylist,
							listType: 'playlist',
							index: 0,
							startSeconds: Math.max(0, targetTime())
						});
					}
				} catch {
					/* fallback */
				}
			} else if (s.videoId) {
				try {
					if (s.playing) {
						player.loadVideoById?.({ videoId: s.videoId, startSeconds: Math.max(0, targetTime()) });
						player.playVideo?.();
					} else {
						player.cueVideoById?.({ videoId: s.videoId, startSeconds: Math.max(0, targetTime()) });
					}
				} catch {
					/* fallback */
				}
			}
			return;
		}

		// Same video already loaded
		if (s.playing) {
			// If we are the director, our player is the source of truth for the room: never seek or nudge ourselves
			if (!room.isDirector()) {
				const target = targetTime();
				const actual = player.getCurrentTime?.() ?? 0;
				const curDrift = target - actual;
				drift = curDrift;
				if (Math.abs(curDrift) > DRIFT_TOLERANCE) {
					try {
						player.seekTo?.(target, true);
					} catch {}
				}
			}
			if (playerState !== PLAYING) {
				try {
					player.playVideo?.();
				} catch {}
			}
		} else {
			// Video is paused: pause immediately and do not seek (seeking unpauses in YouTube HTML5)
			drift = 0;
			if (playerState !== PAUSED) {
				try {
					player.pauseVideo?.();
				} catch {}
			}
		}
	}

	function broadcastStatus(): void {
		if (typeof window === 'undefined') return;
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
	}

	function unlock(): void {
		unlocked = true;
		muted = false;
		if (volume === 0) setVolume(80);
		if (!ready || !player) return;
		try {
			player.unMute();
			player.setVolume(volume > 0 ? volume : 80);
			if (player.playVideo) player.playVideo();
		} catch {
			/* settling */
		}
		applyToPlayer();
		broadcastStatus();
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
		broadcastStatus();
	}

	function toggleMute(): void {
		if (!unlocked) {
			unlock();
			return;
		}
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
		broadcastStatus();
	}

	function togglePlay(): void {
		if (!unlocked) {
			unlock();
		}
		if (!room.canControlPlayback) return;
		const curPos = ready && player?.getCurrentTime ? (player.getCurrentTime() ?? room.state.position) : room.state.position;
		const nextPlaying = !room.state.playing;

		// Immediately command YouTube player for instant responsiveness
		if (ready && player) {
			try {
				if (nextPlaying) {
					player.playVideo?.();
				} else {
					player.pauseVideo?.();
				}
			} catch {}
		}

		room.toggle(curPos);

		if (ready && player) {
			applyToPlayer();
		}
	}

	function skip(): void {
		if (!room.canSkip) return;
		room.skip();
		applyToPlayer();
	}

	function seek(time: number): void {
		if (!room.canControlPlayback) return;
		localTime = time;
		room.seekTo(time);
		if (ready && player?.seekTo) player.seekTo(time, true);
	}

	let ro: ResizeObserver | null = null;
	let mo: MutationObserver | null = null;
	let observedViewport: HTMLElement | null = null;

	function syncViewportPosition(): void {
		if (typeof document === 'undefined' || !containerEl) return;
		const viewport = document.getElementById('room-video-viewport');
		const inActiveRoom = room.joinState === 'approved';
		const hasVideo = !!room.state.videoId;

		// If inactive, no video, or any full-screen modal dialog is open (e.g. Dawn Ritual, Edit Profile, HUD), hide from viewport
		const modalOpen = !!document.querySelector('[aria-modal="true"]');
		const isMinimized = viewport?.getAttribute('data-minimized') === 'true';

		if (!viewport || !inActiveRoom || !hasVideo || modalOpen || isMinimized) {
			// Persistent background audio: keep within viewport boundary with safe hidden styling
			// Avoid top: -9999px as modern Chromium/Firefox throttle or pause offscreen iframes
			containerEl.style.position = 'fixed';
			containerEl.style.bottom = '0px';
			containerEl.style.right = '0px';
			containerEl.style.top = 'auto';
			containerEl.style.left = 'auto';
			containerEl.style.width = '200px';
			containerEl.style.height = '120px';
			containerEl.style.opacity = '0.01';
			containerEl.style.pointerEvents = 'none';
			containerEl.style.zIndex = '-9999';
			return;
		}

		const rect = viewport.getBoundingClientRect();
		if (rect.width < 20 || rect.height < 20) {
			containerEl.style.position = 'fixed';
			containerEl.style.bottom = '0px';
			containerEl.style.right = '0px';
			containerEl.style.top = 'auto';
			containerEl.style.left = 'auto';
			containerEl.style.width = '200px';
			containerEl.style.height = '120px';
			containerEl.style.opacity = '0.01';
			containerEl.style.pointerEvents = 'none';
			containerEl.style.zIndex = '-9999';
			return;
		}
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
		if (!mo && document.body) {
			mo = new MutationObserver(() => syncViewportPosition());
			mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal', 'data-minimized'] });
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
						autoplay: 1,
						controls: 0,
						rel: 0,
						playsinline: 1,
						enablejsapi: 1,
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
						onError: (err: any) => {
							if (!alive) return;
							apiError = true;
							console.warn('[GlobalPlayer] YouTube playback error code:', err?.data);
							// If a video cannot be played (e.g. embedding restricted or deleted), auto-advance queue or load fallback
							if (room.state.playing) {
								setTimeout(() => {
									if (alive && room.state.playing) {
										if (room.state.queue.length > 0) {
											room.skip();
										} else {
											// Switch to a guaranteed embeddable lofi stream so the room never falls dead silent
											room.add(
												'4xDzrJKXOOY',
												'Lofi Girl - Synthwave Radio',
												'Lofi Girl',
												'All Nighter',
												'youtube'
											);
										}
									}
								}, 1500);
							}
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
		const onWindowScroll = () => syncViewportPosition();

		// Any user interaction anywhere in the window unlocks and enables audio immediately
		const onUserInteraction = (e: Event) => {
			if (!unlocked) {
				const target = e.target as HTMLElement | null;
				// If clicking directly on the video mute overlay, toggleMute will handle unlocking/unmuting
				if (target?.closest?.('.video-mute-overlay') || target?.closest?.('[data-video-overlay]')) {
					return;
				}
				unlock();
			}
		};

		window.addEventListener('click', onUserInteraction, { capture: true, passive: true });
		window.addEventListener('keydown', onUserInteraction, { capture: true, passive: true });
		window.addEventListener('touchstart', onUserInteraction, { capture: true, passive: true });

		window.addEventListener('an:player:set-volume', onVolumeEvent);
		window.addEventListener('an:player:toggle-mute', onMuteToggleEvent);
		window.addEventListener('an:player:skip', onSkipEvent);
		window.addEventListener('an:player:toggle', onToggleEvent);
		window.addEventListener('an:player:seek', onSeekEvent);
		window.addEventListener('an:player:unlock', onUnlockEvent);
		window.addEventListener('resize', onWindowResize);
		window.addEventListener('scroll', onWindowScroll, { passive: true });

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
			if (mo) mo.disconnect();
			window.removeEventListener('click', onUserInteraction, { capture: true });
			window.removeEventListener('keydown', onUserInteraction, { capture: true });
			window.removeEventListener('touchstart', onUserInteraction, { capture: true });
			window.removeEventListener('an:player:set-volume', onVolumeEvent);
			window.removeEventListener('an:player:toggle-mute', onMuteToggleEvent);
			window.removeEventListener('an:player:skip', onSkipEvent);
			window.removeEventListener('an:player:toggle', onToggleEvent);
			window.removeEventListener('an:player:seek', onSeekEvent);
			window.removeEventListener('an:player:unlock', onUnlockEvent);
			window.removeEventListener('resize', onWindowResize);
			window.removeEventListener('scroll', onWindowScroll);
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
	class="overflow-hidden bg-night shadow-2xl transition-[opacity] duration-200 group"
	style="position: fixed; top: -9999px; left: -9999px; width: 320px; height: 180px; opacity: 0.001; pointer-events: none; z-index: -1;"
	aria-hidden={room.joinState !== 'approved'}
>
	<div
		class="relative h-full w-full [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:h-full [&>iframe]:w-full"
	>
		<div bind:this={frameEl}></div>

		<!-- Interactive button overlay right on the video itself: clicking mutes/unmutes locally for everyone -->
		<button
			type="button"
			data-video-overlay
			class="video-mute-overlay absolute inset-0 z-10 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-all cursor-pointer border-0"
			onclick={(e) => {
				e.stopPropagation();
				toggleMute();
			}}
			aria-label={muted || volume === 0 ? 'Unmute video audio' : 'Mute video audio'}
			title={muted || volume === 0 ? 'Click to unmute' : 'Click to mute'}
		>
			<span class="flex h-14 w-14 items-center justify-center rounded-full bg-night/85 text-cream border border-cream/25 shadow-2xl backdrop-blur-md transition-transform group-hover:scale-110 active:scale-95">
				{#if muted || volume === 0}
					<IconVolumeOff size={26} stroke={2} class="text-taupe" />
				{:else}
					<IconVolume size={26} stroke={2} class="text-aqua-foam" />
				{/if}
			</span>
		</button>

		{#if muted || volume === 0}
			<div class="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-night/85 px-3 py-1 text-xs font-medium text-cream border border-cream/15 backdrop-blur-md shadow-lg group-hover:opacity-0 transition-opacity">
				<IconVolumeOff size={14} stroke={2} class="text-taupe" />
				<span>Muted · click to unmute</span>
			</div>
		{/if}
	</div>
</div>
