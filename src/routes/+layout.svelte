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

	<!-- Top constellation -->
	<i class="star" style="--x: 8%; --y: 6%; --s: 3px; --d: 7s; --dl: 0.2s"></i>
	<i class="star" style="--x: 18%; --y: 14%; --s: 4px; --d: 8.5s; --dl: 0.4s"></i>
	<i class="star star--warm" style="--x: 29%; --y: 8%; --s: 3px; --d: 6s; --dl: 1.1s"></i>
	<i class="star" style="--x: 38%; --y: 17%; --s: 2.5px; --d: 9s; --dl: 2.3s"></i>
	<i class="star star--lamp" style="--x: 52%; --y: 7%; --s: 3.5px; --d: 8s; --dl: 0.7s"></i>
	<i class="star star--warm" style="--x: 64%; --y: 12%; --s: 3px; --d: 7.5s; --dl: 1.9s"></i>
	<i class="star" style="--x: 72%; --y: 9%; --s: 3.5px; --d: 6.5s; --dl: 1.8s"></i>
	<i class="star star--warm" style="--x: 83%; --y: 6%; --s: 2.5px; --d: 8.5s; --dl: 0.5s"></i>
	<i class="star" style="--x: 93%; --y: 14%; --s: 3px; --d: 7s; --dl: 2.1s"></i>

	<!-- Upper-mid constellation -->
	<i class="star star--warm" style="--x: 5%; --y: 28%; --s: 3.5px; --d: 7s; --dl: 1.4s"></i>
	<i class="star" style="--x: 14%; --y: 22%; --s: 2.5px; --d: 8s; --dl: 3.1s"></i>
	<i class="star star--lamp" style="--x: 23%; --y: 33%; --s: 3px; --d: 6.5s; --dl: 0.6s"></i>
	<i class="star star--warm" style="--x: 46%; --y: 26%; --s: 4px; --d: 9.5s; --dl: 0.9s"></i>
	<i class="star" style="--x: 57%; --y: 22%; --s: 2.5px; --d: 7.5s; --dl: 1.5s"></i>
	<i class="star star--warm" style="--x: 69%; --y: 31%; --s: 3.5px; --d: 8s; --dl: 2.7s"></i>
	<i class="star" style="--x: 86%; --y: 33%; --s: 3px; --d: 7.5s; --dl: 2.6s"></i>
	<i class="star star--lamp" style="--x: 95%; --y: 25%; --s: 2.5px; --d: 9s; --dl: 0.3s"></i>

	<!-- Center field -->
	<i class="star star--warm" style="--x: 9%; --y: 41%; --s: 3.5px; --d: 8s; --dl: 3.4s"></i>
	<i class="star" style="--x: 21%; --y: 48%; --s: 2.5px; --d: 6.5s; --dl: 1.2s"></i>
	<i class="star star--lamp" style="--x: 34%; --y: 44%; --s: 3px; --d: 8.5s; --dl: 2.0s"></i>
	<i class="star" style="--x: 49%; --y: 39%; --s: 2px; --d: 7s; --dl: 0.8s"></i>
	<i class="star star--warm" style="--x: 61%; --y: 46%; --s: 3.5px; --d: 9s; --dl: 1.6s"></i>
	<i class="star" style="--x: 77%; --y: 42%; --s: 2.5px; --d: 6.5s; --dl: 2.4s"></i>
	<i class="star star--warm" style="--x: 91%; --y: 49%; --s: 3px; --d: 8.5s; --dl: 0.9s"></i>

	<!-- Lower-mid field -->
	<i class="star" style="--x: 4%; --y: 62%; --s: 3px; --d: 7.5s; --dl: 1.7s"></i>
	<i class="star star--lamp" style="--x: 16%; --y: 57%; --s: 2.5px; --d: 8s; --dl: 2.5s"></i>
	<i class="star" style="--x: 28%; --y: 66%; --s: 3.5px; --d: 7s; --dl: 0.4s"></i>
	<i class="star star--warm" style="--x: 43%; --y: 61%; --s: 3px; --d: 9s; --dl: 1.3s"></i>
	<i class="star" style="--x: 61%; --y: 58%; --s: 3px; --d: 6s; --dl: 1.2s"></i>
	<i class="star star--warm" style="--x: 74%; --y: 64%; --s: 3.5px; --d: 8.5s; --dl: 2.8s"></i>
	<i class="star star--lamp" style="--x: 88%; --y: 60%; --s: 2.5px; --d: 7s; --dl: 0.6s"></i>

	<!-- Bottom field -->
	<i class="star star--warm" style="--x: 12%; --y: 78%; --s: 3px; --d: 8s; --dl: 1.9s"></i>
	<i class="star" style="--x: 25%; --y: 84%; --s: 3.5px; --d: 6.5s; --dl: 0.5s"></i>
	<i class="star star--lamp" style="--x: 54%; --y: 81%; --s: 3px; --d: 8.5s; --dl: 2.2s"></i>
	<i class="star star--warm" style="--x: 68%; --y: 87%; --s: 2.5px; --d: 7s; --dl: 1.0s"></i>
	<i class="star" style="--x: 82%; --y: 79%; --s: 3.5px; --d: 9s; --dl: 1.7s"></i>
	<i class="star star--warm" style="--x: 94%; --y: 85%; --s: 3px; --d: 7.5s; --dl: 2.4s"></i>

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
