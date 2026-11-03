<script lang="ts">
	import { onMount } from 'svelte';
	import { loadYouTubeApi } from '#lib/room/youtube';
	import { siteAudio, INTERSTELLAR_VIDEO_ID } from '#lib/audio/site-audio.svelte';
	import { room } from '#lib/room/room.svelte';

	let frameEl: HTMLDivElement | undefined = $state();
	let player: any = null;
	let ready = $state(false);

	onMount(() => {
		let alive = true;

		loadYouTubeApi()
			.then((YT) => {
				if (!alive || !frameEl) return;
				player = new YT.Player(frameEl, {
					width: '200',
					height: '200',
					videoId: INTERSTELLAR_VIDEO_ID,
					playerVars: {
						autoplay: 0,
						controls: 0,
						disablekb: 1,
						loop: 1,
						playlist: INTERSTELLAR_VIDEO_ID,
						origin: location.origin
					},
					events: {
						onReady: () => {
							ready = true;
							siteAudio.ready = true;
							try {
								player.setVolume(siteAudio.volume);
								if (siteAudio.isPlaying && !room.state.playing) {
									player.unMute();
									player.playVideo();
								} else {
									player.mute();
								}
							} catch {}
						},
						onStateChange: (e: { data: number }) => {
							// Loop back if ended
							if (e.data === 0 && siteAudio.isPlaying) {
								try {
									player.playVideo();
								} catch {}
							}
						}
					}
				});
			})
			.catch(() => {});

		return () => {
			alive = false;
			try {
				player?.destroy();
			} catch {}
		};
	});

	$effect(() => {
		if (!ready || !player) return;

		// If a room video is currently playing, pause the site's background soundtrack
		if (room.state.playing) {
			try {
				player.pauseVideo();
			} catch {}
			return;
		}

		if (siteAudio.isPlaying) {
			try {
				player.unMute();
				player.setVolume(siteAudio.volume);
				player.playVideo();
			} catch {}
		} else {
			try {
				player.pauseVideo();
			} catch {}
		}
	});

	$effect(() => {
		if (!ready || !player) return;
		try {
			player.setVolume(siteAudio.volume);
		} catch {}
	});
</script>

<div
	class="fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none -z-50 overflow-hidden"
	aria-hidden="true"
>
	<div bind:this={frameEl}></div>
</div>
