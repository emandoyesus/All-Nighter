<script lang="ts">
	import Hero from '#lib/components/Hero.svelte';
	import Rituals from '#lib/components/Rituals.svelte';
	import NightZones from '#lib/components/NightZones.svelte';
	import ArchiveSection from '#lib/components/ArchiveSection.svelte';
	import JoinBand from '#lib/components/JoinBand.svelte';
	import SEO from '#lib/components/SEO.svelte';
	import { buildWebSiteSchema, buildWebApplicationSchema } from '#lib/seo';

	const schemas = [buildWebSiteSchema(), buildWebApplicationSchema()];
</script>

<SEO
	title="All Nighter · Show up. Lock in till sunrise."
	rawTitle={true}
	description="Doors open at sunset. Lock in till sunrise. A real-time collaborative focus sanctuary with synchronized music, shared track queue, live presence, and an unbroken countdown to dawn."
	canonical="/"
	type="website"
	jsonLd={schemas}
/>

<main>
	<Hero />
	<Rituals />
	<NightZones />
	<ArchiveSection />
	<JoinBand />
	<footer class="border-t border-cream/10">
		<div class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-7">
			<p class="num text-xs text-faint">All Nighter · built between 1 and 6 am</p>
			<p class="num text-xs text-faint">keep the tab open</p>
		</div>
	</footer>
</main>
