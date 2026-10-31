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

	<!-- 18 Serene Stars across the night cosmos -->
	<!-- Upper Sky -->
	<i class="star" style="--x: 8%; --y: 14%; --s: 2.5px; --d: 7.5s; --dl: 0.8s"></i>
	<i class="star star--warm" style="--x: 24%; --y: 8%; --s: 3px; --d: 8s; --dl: 1.5s"></i>
	<i class="star" style="--x: 42%; --y: 16%; --s: 2px; --d: 9s; --dl: 0.2s"></i>
	<i class="star star--warm" style="--x: 63%; --y: 11%; --s: 2.5px; --d: 6.5s; --dl: 2.1s"></i>
	<i class="star" style="--x: 78%; --y: 7%; --s: 3px; --d: 8.5s; --dl: 1.2s"></i>
	<i class="star star--lamp" style="--x: 92%; --y: 15%; --s: 2.5px; --d: 7s; --dl: 0.4s"></i>

	<!-- Mid-Upper Sky -->
	<i class="star star--warm" style="--x: 5%; --y: 32%; --s: 3px; --d: 8s; --dl: 3.2s"></i>
	<i class="star" style="--x: 31%; --y: 28%; --s: 2px; --d: 7.5s; --dl: 1.7s"></i>
	<i class="star" style="--x: 51%; --y: 25%; --s: 3.5px; --d: 9.5s; --dl: 0.9s"></i>
	<i class="star star--warm" style="--x: 72%; --y: 34%; --s: 2.5px; --d: 8s; --dl: 2.4s"></i>
	<i class="star" style="--x: 88%; --y: 27%; --s: 3px; --d: 7s; --dl: 0.5s"></i>

	<!-- Mid-Lower Sky -->
	<i class="star star--lamp" style="--x: 16%; --y: 52%; --s: 2.5px; --d: 8.5s; --dl: 1.4s"></i>
	<i class="star" style="--x: 39%; --y: 48%; --s: 2px; --d: 6.5s; --dl: 2.8s"></i>
	<i class="star star--warm" style="--x: 62%; --y: 56%; --s: 2.5px; --d: 7.5s; --dl: 0.6s"></i>
	<i class="star" style="--x: 83%; --y: 50%; --s: 3px; --d: 8s; --dl: 1.9s"></i>

	<!-- Lower Sky -->
	<i class="star star--warm" style="--x: 11%; --y: 76%; --s: 2.5px; --d: 7.5s; --dl: 0.3s"></i>
	<i class="star" style="--x: 47%; --y: 82%; --s: 3px; --d: 9s; --dl: 2.2s"></i>
	<i class="star star--lamp" style="--x: 76%; --y: 79%; --s: 2.5px; --d: 8s; --dl: 1.1s"></i>

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
