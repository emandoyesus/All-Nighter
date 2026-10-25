<script lang="ts">
	import { onMount } from 'svelte';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconSunrise from '@tabler/icons-svelte/icons/sunrise';
	import IconSun from '@tabler/icons-svelte/icons/sun';

	type CityZone = {
		city: string;
		region: string;
		timeZone: string;
	};

	const CITIES: CityZone[] = [
		{ city: 'Tokyo', region: 'Asia', timeZone: 'Asia/Tokyo' },
		{ city: 'Seoul', region: 'Asia', timeZone: 'Asia/Seoul' },
		{ city: 'Singapore', region: 'Asia', timeZone: 'Asia/Singapore' },
		{ city: 'Nairobi', region: 'Africa', timeZone: 'Africa/Nairobi' },
		{ city: 'Cairo', region: 'Africa', timeZone: 'Africa/Cairo' },
		{ city: 'Berlin', region: 'Europe', timeZone: 'Europe/Berlin' },
		{ city: 'London', region: 'Europe', timeZone: 'Europe/London' },
		{ city: 'São Paulo', region: 'Americas', timeZone: 'America/Sao_Paulo' },
		{ city: 'New York', region: 'Americas', timeZone: 'America/New_York' },
		{ city: 'Chicago', region: 'Americas', timeZone: 'America/Chicago' },
		{ city: 'San Francisco', region: 'Americas', timeZone: 'America/Los_Angeles' },
		{ city: 'Honolulu', region: 'Pacific', timeZone: 'Pacific/Honolulu' }
	];

	let now = $state(Date.now());

	onMount(() => {
		const timer = setInterval(() => {
			now = Date.now();
		}, 30000);
		return () => clearInterval(timer);
	});

	function getCityInfo(tz: string) {
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			hour: 'numeric',
			minute: '2-digit',
			hour12: false
		});
		const parts = formatter.formatToParts(new Date(now));
		const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
		const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';

		// Night is between 22:00 and 06:00
		const isDeepNight = hour >= 23 || hour < 5;
		const isDawn = hour >= 5 && hour < 7;
		const isNight = hour >= 21 || hour < 7;

		return {
			timeString: `${String(hour).padStart(2, '0')}:${minute}`,
			hour,
			isDeepNight,
			isDawn,
			isNight
		};
	}

	const cityStatuses = $derived(
		CITIES.map((c) => ({
			...c,
			...getCityInfo(c.timeZone)
		}))
	);

	const nightCities = $derived(cityStatuses.filter((c) => c.isNight));
</script>

<section class="border-t border-cream/10 bg-night/80 py-12 md:py-16">
	<div class="mx-auto max-w-[1400px] px-5">
		<div class="flex flex-wrap items-baseline justify-between gap-3">
			<div>
				<p class="eyebrow">Who's awake</p>
				<h2 class="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
					Where night has fallen right now.
				</h2>
			</div>
			<p class="num text-xs text-faint">
				{nightCities.length} of {CITIES.length} time zones under darkness
			</p>
		</div>

		<p class="mt-3 max-w-[54ch] text-sm leading-relaxed text-taupe">
			Across the globe, someone else has their desk lamp on. No matter where you're locked in, you're not the only one awake.
		</p>

		<!-- Horizontal city timezone badges -->
		<div class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
			{#each cityStatuses as city (city.city)}
				<div
					class="flex flex-col justify-between rounded-field border p-3 transition-colors {city.isDeepNight
						? 'border-lamp/40 bg-lamp/5 shadow-[0_0_15px_rgba(183,255,114,0.06)]'
						: city.isDawn
							? 'border-amber-400/30 bg-amber-400/5'
							: 'border-cream/8 bg-night/40 opacity-50'}"
				>
					<div class="flex items-center justify-between gap-1">
						<span class="truncate text-xs font-medium {city.isDeepNight ? 'text-cream' : 'text-taupe'}">
							{city.city}
						</span>
						{#if city.isDeepNight}
							<IconMoon size={13} stroke={1.5} class="text-lamp shrink-0" />
						{:else if city.isDawn}
							<IconSunrise size={13} stroke={1.5} class="text-amber-300 shrink-0" />
						{:else}
							<IconSun size={12} stroke={1.5} class="text-faint/60 shrink-0" />
						{/if}
					</div>

					<div class="mt-3 flex items-baseline justify-between">
						<span class="num text-sm font-semibold {city.isDeepNight ? 'text-lamp' : 'text-cream/90'}">
							{city.timeString}
						</span>
						<span class="num text-[10px] uppercase tracking-wider text-faint">
							{#if city.isDeepNight}
								deep night
							{:else if city.isDawn}
								dawn
							{:else}
								daylight
							{/if}
						</span>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
