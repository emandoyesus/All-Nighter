<script lang="ts">
	import { TELEGRAM_URL } from '#lib/config';
	import IconBrandTelegram from '@tabler/icons-svelte/icons/brand-telegram';
</script>

<section id="top" class="relative overflow-hidden">
	<div class="lamp-glow pointer-events-none absolute inset-0" aria-hidden="true"></div>

	<div
		class="relative mx-auto grid max-w-[1400px] items-center gap-10 px-5 pb-16 pt-12 md:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-24"
	>
		<div class="hero-rise">
			<p class="eyebrow">Exam week · campus</p>
			<h1 class="mt-5 text-5xl font-semibold leading-[1.03] tracking-tight md:text-6xl">
				Lock in till sunrise.
			</h1>
			<p class="mt-5 max-w-[46ch] text-lg leading-relaxed text-taupe">
				A shared room for our all-nighters: one countdown, one queue, everyone awake and building.
			</p>
			<div class="mt-8 flex flex-wrap gap-3">
				<a href="#room" class="btn btn-primary">Open the room</a>
				<a href={TELEGRAM_URL} class="btn btn-ghost">
					<IconBrandTelegram size={16} stroke={1.5} />
					Join the Telegram
				</a>
			</div>
		</div>

		<figure class="hero-rise hero-delay-1 relative">
			<!-- Swap this placeholder for a real photo from one of your nights -->
			<img
				src="https://picsum.photos/seed/night-desk-lamp/1000/1250"
				alt=""
				width="1000"
				height="1250"
				class="photo-warm aspect-[4/5] w-full rounded-card object-cover ring-1 ring-cream/10"
			/>
			<div
				class="pointer-events-none absolute inset-0 rounded-card bg-gradient-to-t from-night/70 via-transparent to-transparent"
				aria-hidden="true"
			></div>
		</figure>
	</div>
</section>
