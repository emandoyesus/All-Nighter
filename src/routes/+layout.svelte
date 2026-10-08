<script lang="ts">
	import '@fontsource-variable/space-grotesk';
	import '@fontsource-variable/jetbrains-mono';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="cosmos" aria-hidden="true">
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

	<span class="meteor" style="--y: 8%; --a: 21deg; --dur: 9s; --delay: 3s"></span>
	<span class="meteor" style="--y: 22%; --a: 26deg; --dur: 11s; --delay: 14s"></span>
	<span class="meteor" style="--y: 38%; --a: 18deg; --dur: 13s; --delay: 27s"></span>
</div>

<div class="grain-layer" aria-hidden="true"></div>

{@render children()}
