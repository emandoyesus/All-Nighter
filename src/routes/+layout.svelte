<script lang="ts">
	import '@fontsource-variable/space-grotesk';
	import '@fontsource-variable/jetbrains-mono';
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import favicon from '#lib/assets/favicon.svg';
	import { gsap, prefersReducedMotion, ScrollTrigger, setupGsap } from '#lib/motion';
	import { room } from '#lib/room/room.svelte';
	import GlobalPlayer from '#lib/components/GlobalPlayer.svelte';
	import RoomMusicDock from '#lib/components/RoomMusicDock.svelte';
	import DeskHud from '#lib/components/DeskHud.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	let showDeskHud = $state(false);

	function getNightPhase(): 'dusk' | 'night' | 'dawn' | 'day' {
		const hour = new Date().getHours();
		if (hour >= 20 && hour < 23) return 'dusk';
		if (hour >= 23 || hour < 5) return 'night';
		if (hour >= 5 && hour < 8) return 'dawn';
		return 'dusk';
	}

	let nightPhase = $state<'dusk' | 'night' | 'dawn' | 'day'>(getNightPhase());

	onMount(() => {
		room.init();
		nightPhase = getNightPhase();
		const phaseTimer = window.setInterval(() => {
			nightPhase = getNightPhase();
		}, 60000);

		const onOpenDeskHud = () => (showDeskHud = true);
		window.addEventListener('an:open-desk-hud', onOpenDeskHud);

		if (prefersReducedMotion()) {
			return () => {
				window.clearInterval(phaseTimer);
				window.removeEventListener('an:open-desk-hud', onOpenDeskHud);
			};
		}

		setupGsap();

		const ctx = gsap.context(() => {
			gsap.set(['.sky--far', '.sky--mid', '.sky--near', '.sky--milky'], {
				scale: 1.18,
				transformOrigin: 'center'
			});

			const scroll = {
				trigger: document.documentElement,
				start: 'top top',
				end: 'bottom bottom',
				scrub: true
			};

			gsap.to('.sky--far', { yPercent: 4, ease: 'none', scrollTrigger: scroll });
			gsap.to('.sky--mid', { yPercent: 8, ease: 'none', scrollTrigger: scroll });
			gsap.to('.sky--near', { yPercent: 13, ease: 'none', scrollTrigger: scroll });
			gsap.to('.sky--milky', { yPercent: 6, rotation: -2, ease: 'none', scrollTrigger: scroll });
		});

		return () => {
			window.clearInterval(phaseTimer);
			window.removeEventListener('an:open-desk-hud', onOpenDeskHud);
			ctx.revert();
		};
	});

	afterNavigate(() => {
		requestAnimationFrame(() => ScrollTrigger.refresh());
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="cosmos cosmos--{nightPhase}" aria-hidden="true">
	<div class="sky sky--milky"></div>
	<div class="sky sky--far"></div>
	<div class="sky sky--mid"></div>
	<div class="sky sky--near"></div>

	<i class="star" style="--x: 18%; --y: 14%; --s: 4px; --d: 8.5s; --dl: 0.4s"></i>
	<i class="star" style="--x: 72%; --y: 9%; --s: 3px; --d: 6.5s; --dl: 1.8s"></i>
	<i class="star star--warm" style="--x: 46%; --y: 26%; --s: 3.5px; --d: 9.5s; --dl: 0.9s"></i>
	<i class="star" style="--x: 86%; --y: 33%; --s: 2.5px; --d: 7.5s; --dl: 2.6s"></i>
	<i class="star star--warm" style="--x: 9%; --y: 41%; --s: 3px; --d: 8s; --dl: 3.4s"></i>
	<i class="star" style="--x: 61%; --y: 58%; --s: 2.5px; --d: 6s; --dl: 1.2s"></i>

	<span class="meteor" style="--x: 24%; --y: 8%; --a: 21deg; --dur: 18s; --delay: 5s"></span>
	<span class="meteor" style="--x: 58%; --y: 20%; --a: 26deg; --dur: 23s; --delay: 13s"></span>
	<span class="meteor" style="--x: 78%; --y: 34%; --a: 18deg; --dur: 28s; --delay: 22s"></span>
</div>

<div class="grain-layer" aria-hidden="true"></div>

<!-- Persistent YouTube Player & Audio Sync Engine -->
<GlobalPlayer />

<div class="relative min-h-screen flex flex-col {room.joinState === 'approved' ? 'pb-16 sm:pb-20' : ''}">
	{@render children()}
</div>

<!-- Persistent Shared Music Dock across the site -->
<RoomMusicDock />

<DeskHud bind:open={showDeskHud} />
