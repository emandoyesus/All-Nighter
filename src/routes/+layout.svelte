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
.stars, .stars-2, .shooting-star, .milky-way { position: fixed; inset: 0; pointer-events: none; }
.stars { z-index: 50; background: radial-gradient(1px 1px at 30px 40px, #fff, transparent 70%); opacity: 0.12; }
</style>

	<link rel="icon" href={favicon} />
</svelte:head>

<div class="stars" aria-hidden="true"></div>
<div class="stars-2" aria-hidden="true"></div>
<div class="milky-way" aria-hidden="true"></div>
<div class="shooting-star" aria-hidden="true"></div>
<div class="shooting-star shooting-star--2" aria-hidden="true"></div>
<div class="shooting-star shooting-star--3" aria-hidden="true"></div>
<div class="grain-layer" aria-hidden="true"></div>

{@render children()}
