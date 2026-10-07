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

<div class="stars" aria-hidden="true"></div>
<div class="stars-2" aria-hidden="true"></div>
<div class="milky-way" aria-hidden="true"></div>
<div class="shooting-star" aria-hidden="true"></div>
<div class="shooting-star shooting-star--2" aria-hidden="true"></div>
<div class="shooting-star shooting-star--3" aria-hidden="true"></div>
<div class="grain-layer" aria-hidden="true"></div>

{@render children()}
