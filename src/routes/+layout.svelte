<script lang="ts">
	import '@fontsource-variable/space-grotesk';
	import '@fontsource-variable/jetbrains-mono';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<style>
body { background: #000; }
.stars, .stars-2, .shooting-star, .milky-way { position: fixed; inset: 0; pointer-events: none; }
.stars { z-index: 50; opacity: 0.18; background-image: radial-gradient(1px 1px at 24px 32px, #fff, transparent 70%), radial-gradient(0.8px 0.8px at 68px 16px, #fff, transparent 70%), radial-gradient(0.9px 0.9px at 112px 48px, #fff, transparent 70%), radial-gradient(1px 1px at 156px 24px, #fff, transparent 70%); background-size: 200px 120px; }
</style>

	<link rel="icon" href={favicon} />
</svelte:head>

<div class="grain-layer" aria-hidden="true"></div>

{@render children()}
