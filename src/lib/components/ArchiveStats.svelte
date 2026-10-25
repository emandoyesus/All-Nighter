<script lang="ts">
	import { archiveStats, contributors } from '#lib/data/archive';
	import { countUp } from '#lib/count-up';
	import { reveal } from '#lib/reveal';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconClock from '@tabler/icons-svelte/icons/clock';
	import IconMicrophone from '@tabler/icons-svelte/icons/microphone-2';
	import IconFlame from '@tabler/icons-svelte/icons/flame';
	import IconUsers from '@tabler/icons-svelte/icons/users';

	const stats = archiveStats();
	const crew = contributors().length;
</script>

<section class="mx-auto max-w-[1400px] px-5 pt-8">
	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
		<div class="panel p-4" data-reveal use:reveal={0}>
			<p class="flex items-center gap-1.5 text-xs text-faint">
				<IconMoon size={14} stroke={1.5} />
				Nights logged
			</p>
			<p class="num mt-2 text-2xl font-semibold text-cream" use:countUp={stats.nights}>
				{stats.nights}
			</p>
			<p class="num mt-0.5 text-[11px] text-faint">{crew} in the crew</p>
		</div>

		<div class="panel p-4" data-reveal use:reveal={55}>
			<p class="flex items-center gap-1.5 text-xs text-faint">
				<IconMusic size={14} stroke={1.5} />
				Tracks played
			</p>
			<p class="num mt-2 text-2xl font-semibold text-cream" use:countUp={stats.tracks}>
				{stats.tracks}
			</p>
			<p class="num mt-0.5 text-[11px] text-faint">most is {stats.topGenre.name}</p>
		</div>

		<div class="panel p-4" data-reveal use:reveal={110}>
			<p class="flex items-center gap-1.5 text-xs text-faint">
				<IconClock size={14} stroke={1.5} />
				Hours awake
			</p>
			<p class="num mt-2 text-2xl font-semibold text-cream" use:countUp={stats.hours}>
				{stats.hours}
			</p>
			<p class="num mt-0.5 text-[11px] text-faint">longest {stats.longest?.hours}</p>
		</div>

		<div class="panel p-4" data-reveal use:reveal={165}>
			<p class="flex items-center gap-1.5 text-xs text-faint">
				<IconMicrophone size={14} stroke={1.5} />
				Most-played artist
			</p>
			<p class="mt-2 truncate text-lg font-semibold leading-tight text-cream">{stats.topArtist.name}</p>
			<p class="num mt-0.5 text-[11px] text-faint">
				<span use:countUp={stats.topArtist.count}>{stats.topArtist.count}</span> tracks
			</p>
		</div>

		<div class="panel p-4" data-reveal use:reveal={220}>
			<p class="flex items-center gap-1.5 text-xs text-faint">
				<IconFlame size={14} stroke={1.5} />
				Top contributor
			</p>
			<p class="mt-2 truncate text-lg font-semibold leading-tight text-cream">{stats.topContributor.name}</p>
			<p class="num mt-0.5 inline-flex items-center gap-1 text-[11px] text-faint">
				<IconUsers size={11} stroke={1.5} />
				<span use:countUp={stats.topContributor.count}>{stats.topContributor.count}</span> picks
			</p>
		</div>
	</div>
</section>
