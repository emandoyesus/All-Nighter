<script lang="ts">
	import Nav from '#lib/components/Nav.svelte';
	import Hero from '#lib/components/Hero.svelte';
	import Rituals from '#lib/components/Rituals.svelte';
	import NightZones from '#lib/components/NightZones.svelte';
	import ArchiveSection from '#lib/components/ArchiveSection.svelte';
	import JoinBand from '#lib/components/JoinBand.svelte';
</script>

<svelte:head>
	<title>All Nighter · tonight</title>
</svelte:head>

<Nav />

<main>
	<Hero />
	<Rituals />
	<NightZones />
	<!-- Soft gradient mask feathering into the grounding layer -->
	<div class="h-28 -mb-28 pointer-events-none relative z-10 bg-gradient-to-b from-transparent to-night"></div>
	<!-- Opaque grounding: stops the skyline & cosmos background from here downward -->
	<div class="relative z-10 bg-night border-t border-cream/10">
		<ArchiveSection />
		<JoinBand />
		<footer class="border-t border-cream/10">
			<div class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-7">
				<p class="num text-xs text-faint">All Nighter · built between 1 and 6 am</p>
				<p class="num text-xs text-faint">keep the tab open</p>
			</div>
		</footer>
	</div>
</main>
