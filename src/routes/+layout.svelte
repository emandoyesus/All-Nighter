<script lang="ts">
	import '@fontsource-variable/space-grotesk';
	import '@fontsource-variable/jetbrains-mono';
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import favicon from '#lib/assets/favicon.svg';
	import { ScrollTrigger } from '#lib/motion';
	import { room } from '#lib/room/room.svelte';
	import GlobalPlayer from '#lib/components/GlobalPlayer.svelte';
	import SiteAudioPlayer from '#lib/components/SiteAudioPlayer.svelte';
	import RoomMusicDock from '#lib/components/RoomMusicDock.svelte';
	import DeskHud from '#lib/components/DeskHud.svelte';
	import PeerProfileModal from '#lib/components/PeerProfileModal.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	let showDeskHud = $state(false);
	let prevMode = $state<string | undefined>(undefined);

	$effect(() => {
		const currentMode = room.mode;
		if (prevMode !== undefined && prevMode !== 'focus' && currentMode === 'focus' && room.joinState === 'approved') {
			showDeskHud = true;
		}
		prevMode = currentMode;
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
	{@render children()}
</div>

<!-- Persistent Shared Music Dock across the site -->
<RoomMusicDock />

<DeskHud bind:open={showDeskHud} />
<PeerProfileModal />
