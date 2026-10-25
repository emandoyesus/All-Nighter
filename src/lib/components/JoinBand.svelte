<script lang="ts">
	import { TELEGRAM_URL } from '#lib/config';
	import { reveal } from '#lib/reveal';
	import { splitReveal } from '#lib/split-reveal';
	import { scrubWords } from '#lib/scrub-words';
	import { magnetic } from '#lib/magnetic';
	import Marquee from './Marquee.svelte';

	const ticker = [
		'till sunrise',
		'one queue',
		'everyone has the aux',
		'dawn closes the book',
		'keep the tab open',
		'built between 1 and 6 am',
		'work alongside each other',
		'the music holds it together'
	];
</script>

<section class="relative overflow-hidden border-t border-cream/10">
	<div class="lamp-glow pointer-events-none absolute inset-0" aria-hidden="true"></div>

	<div class="relative mx-auto max-w-[1400px] px-5 pb-16 pt-20 md:pb-20 md:pt-24">
		<h2
			class="max-w-[22ch] text-3xl font-semibold tracking-tight md:text-5xl"
			data-split
			use:splitReveal
		>
			The next one starts when someone opens the door.
		</h2>
		<p class="mt-4 max-w-[46ch] leading-relaxed text-taupe" use:scrubWords>
			We post the link in Telegram first. Bring a track. Bring something to work on.
		</p>
		<div class="mt-8 flex flex-wrap gap-3" data-reveal use:reveal={120}>
			<a href="/room" class="btn btn-primary" use:magnetic={0.2}>Open the door</a>
			<a
				href={TELEGRAM_URL}
				class="btn btn-ghost text-sm"
				use:magnetic={0.12}
				target="_blank"
				rel="noreferrer"
			>
				Telegram
			</a>
		</div>
	</div>

	<div class="relative border-t border-cream/10 bg-night-2/60 py-4">
		<Marquee items={ticker} />
	</div>
</section>
