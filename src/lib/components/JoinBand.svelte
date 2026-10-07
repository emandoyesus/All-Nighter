<script lang="ts">
	import { TELEGRAM_URL } from '#lib/config';
	import { reveal } from '#lib/reveal';
	import IconBrandTelegram from '@tabler/icons-svelte/icons/brand-telegram';
</script>

<section class="relative overflow-hidden border-t border-cream/10">
	<div class="lamp-glow pointer-events-none absolute inset-0" aria-hidden="true"></div>

	<div class="relative mx-auto max-w-[1400px] px-5 py-20 md:py-24" use:reveal>
		<h2 class="max-w-[22ch] text-3xl font-semibold tracking-tight md:text-5xl">
			Next one starts when someone flips the switch.
		</h2>
		<p class="mt-4 max-w-[46ch] leading-relaxed text-taupe">
			The link goes out in Telegram first. Bring a track.
		</p>
		<div class="mt-8">
			<a href={TELEGRAM_URL} class="btn btn-primary">
				<IconBrandTelegram size={16} stroke={1.5} />
				Join the Telegram
			</a>
		</div>
	</div>
</section>
