<script lang="ts">
	import '@fontsource-variable/space-grotesk';
	import '@fontsource-variable/jetbrains-mono';
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import { ScrollTrigger } from '#lib/motion';
	import { room } from '#lib/room/room.svelte';
	import { siteAudio } from '#lib/audio/site-audio.svelte';
	import GlobalPlayer from '#lib/components/GlobalPlayer.svelte';
	import SiteAudioPlayer from '#lib/components/SiteAudioPlayer.svelte';
	import RoomMusicDock from '#lib/components/RoomMusicDock.svelte';
	import DeskHud from '#lib/components/DeskHud.svelte';
	import Nav from '#lib/components/Nav.svelte';
	import PeerProfileModal from '#lib/components/PeerProfileModal.svelte';
	import GlobalPauseModal from '#lib/components/GlobalPauseModal.svelte';
	import ProfileSetupModal from '#lib/components/ProfileSetupModal.svelte';
	import TransferHostModal from '#lib/components/TransferHostModal.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	let showDeskHud = $state(false);
	let prevMode = $state<string | undefined>(undefined);

	$effect(() => {
		const currentMode = room.mode;
		if (prevMode === undefined) {
			prevMode = currentMode;
			if (currentMode === 'focus') {
				siteAudio.play();
			}
			return;
		}
		if (prevMode !== currentMode) {
			if (currentMode === 'focus') {
				if (room.joinState === 'approved') {
					showDeskHud = true;
				}
				siteAudio.play();
			} else if (prevMode === 'focus') {
				siteAudio.pause();
			}
			prevMode = currentMode;
		}
	});

	onMount(() => {
		room.init();

		const onOpenDeskHud = () => (showDeskHud = true);
		window.addEventListener('an:open-desk-hud', onOpenDeskHud);

		return () => {
			window.removeEventListener('an:open-desk-hud', onOpenDeskHud);
		};
	});

	afterNavigate(() => {
		requestAnimationFrame(() => ScrollTrigger.refresh());
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="grain-layer" aria-hidden="true"></div>

<!-- Persistent YouTube Player & Audio Sync Engine -->
<GlobalPlayer />
<SiteAudioPlayer />

<div class="relative min-h-screen flex flex-col {room.joinState === 'approved' ? 'pb-16 sm:pb-20' : ''}">
	<Nav />
	<div class="flex-1 flex flex-col">
		{@render children()}
	</div>
</div>

<!-- Persistent Shared Music Dock across the site -->
<RoomMusicDock />

<DeskHud bind:open={showDeskHud} />
<PeerProfileModal />
<GlobalPauseModal />
<ProfileSetupModal />
<TransferHostModal />
