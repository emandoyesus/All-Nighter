<script lang="ts">
	import { asset } from '$app/paths';
	import { TELEGRAM_URL } from '#lib/config';
	import IconBrandTelegram from '@tabler/icons-svelte/icons/brand-telegram';
</script>

<section id="top" class="relative overflow-hidden">
	<div class="lamp-glow pointer-events-none absolute inset-0" aria-hidden="true"></div>

	<div
		class="relative mx-auto grid max-w-[1400px] items-center gap-10 px-5 pb-16 pt-12 md:grid-cols-[1.15fr_0.85fr] md:gap-8 md:pt-16 lg:grid-cols-[1.2fr_0.8fr] lg:gap-14 lg:pb-24"
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
				<a href="/room" class="btn btn-primary">Open the room</a>
				<a href={TELEGRAM_URL} class="btn btn-ghost">
					<IconBrandTelegram size={16} stroke={1.5} />
					Join the Telegram
				</a>
			</div>
		</div>

		<figure class="hero-rise hero-delay-1 relative">
			<img
				src={asset('nights/hero.jpg')}
				alt="Someone working late at a laptop in a dim room"
				width="1000"
				height="1250"
				class="photo-warm aspect-[4/5] w-full rounded-card object-cover ring-1 ring-cream/10 md:max-h-[58vh] lg:max-h-[66vh]"
			/>
			<div
				class="pointer-events-none absolute inset-0 rounded-card bg-gradient-to-t from-night/70 via-transparent to-transparent"
				aria-hidden="true"
			></div>
		</figure>
	</div>
</section>
