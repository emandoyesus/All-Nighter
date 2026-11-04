<script lang="ts">
	import { page } from '$app/state';
	import Nav from '#lib/components/Nav.svelte';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import IconRadio from '@tabler/icons-svelte/icons/radio';
	import IconDisc from '@tabler/icons-svelte/icons/disc';

	const status = $derived(page.status ?? 404);
	const message = $derived(page.error?.message || 'That page does not exist in the logbook.');
</script>

<svelte:head>
	<title>{status} · All Nighter</title>
</svelte:head>

<Nav />

<main class="relative flex min-h-[calc(100dvh-64px)] md:min-h-[calc(100dvh-68px)] flex-col items-center justify-center px-5 py-16 overflow-hidden">
	<!-- Subtle ambient radial grid -->
	<div class="pointer-events-none absolute inset-0 opacity-20" style="background-image: radial-gradient(rgba(131, 249, 214, 0.15) 1px, transparent 1px); background-size: 24px 24px;"></div>

	<div class="relative w-full max-w-lg rounded-2xl border border-cream/10 bg-gradient-to-b from-night-2 via-night-2 to-night p-8 sm:p-10 text-center shadow-2xl">
		<!-- Moon Crest Icon Badge -->
		<div class="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-lamp/30 bg-lamp/10 text-lamp">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-7 w-7 fill-lamp" aria-hidden="true">
				<path d="M12 1.992a10 10 0 1 0 9.236 13.838c.341 -.82 -.476 -1.644 -1.298 -1.31a6.5 6.5 0 0 1 -6.864 -10.787l.077 -.08c.551 -.63 .113 -1.653 -.758 -1.653h-.266l-.068 -.006l-.06 -.002z" />
			</svg>
		</div>

		<!-- Status Code -->
		<p class="font-mono text-xs uppercase tracking-[0.2em] text-lamp font-medium">
			SIGNAL DISCONNECTED // ERROR {status}
		</p>

		<h1 class="mt-3 text-2xl font-bold tracking-tight text-cream sm:text-3xl">
			Lost in the dead of night.
		</h1>

		<p class="mt-3 text-sm leading-relaxed text-taupe">
			{message}
		</p>

		<!-- Action Links -->
		<div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
			<a href="/" class="btn btn-primary w-full sm:w-auto text-xs px-5">
				<IconArrowLeft size={14} stroke={2} />
				Back to Tonight
			</a>
			<a href="/room" class="btn btn-ghost w-full sm:w-auto text-xs px-4">
				<IconRadio size={14} stroke={1.5} />
				The Room
			</a>
			<a href="/archive" class="btn btn-ghost w-full sm:w-auto text-xs px-4">
				<IconDisc size={14} stroke={1.5} />
				Past Nights
			</a>
		</div>
	</div>
</main>
