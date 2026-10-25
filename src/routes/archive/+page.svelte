<script lang="ts">
	import { asset } from '$app/paths';
	import Nav from '#lib/components/Nav.svelte';
	import ArchiveStats from '#lib/components/ArchiveStats.svelte';
	import UpcomingSessions from '#lib/components/UpcomingSessions.svelte';
	import { nights, genres, contributors } from '#lib/data/archive';
	import { reveal } from '#lib/reveal';
	import { splitReveal } from '#lib/split-reveal';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import IconSearch from '@tabler/icons-svelte/icons/search';
	import IconUsers from '@tabler/icons-svelte/icons/users';
	import IconChevronRight from '@tabler/icons-svelte/icons/chevron-right';

	let query = $state('');
	let contributor = $state('');
	let genre = $state('');
	let month = $state('');

	const months = $derived(
		[...new Set(nights.map((night) => night.iso.slice(0, 7)))].sort().reverse()
	);

	function monthLabel(value: string): string {
		const [year, m] = value.split('-');
		const date = new Date(Number(year), Number(m) - 1, 1);
		return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return [...nights]
			.filter((night) => {
				if (contributor && !night.joined.includes(contributor) && !night.tracklist.some((track) => track.addedBy === contributor)) return false;
				if (genre && !night.tracklist.some((track) => track.genre === genre)) return false;
				if (month && !night.iso.startsWith(month)) return false;
				if (!q) return true;
				const haystack = [
					night.title,
					night.note,
					night.tag,
					...night.joined,
					...night.tracklist.flatMap((track) => [track.title, track.artist, track.addedBy, track.genre])
				]
					.join(' ')
					.toLowerCase();
				return haystack.includes(q);
			})
			.sort((a, b) => (a.iso < b.iso ? 1 : -1));
	});

	function reset(): void {
		query = '';
		contributor = '';
		genre = '';
		month = '';
	}

	const hasFilters = $derived(!!(query || contributor || genre || month));
</script>

<svelte:head>
	<title>The Archive · All Nighter</title>
</svelte:head>

<Nav />

<main>
	<section class="border-b border-cream/10 bg-night-2">
		<div class="mx-auto max-w-[1400px] px-5 py-10 md:py-12">
			<a href="/" class="inline-flex items-center gap-1.5 text-sm text-taupe transition-colors hover:text-cream">
				<IconArrowLeft size={15} stroke={1.5} />
				Tonight
			</a>
			<p class="eyebrow mt-4">{nights.length} nights on record</p>
			<h1
				class="mt-2 text-3xl font-semibold tracking-tight md:text-4xl"
				data-split
				use:splitReveal={{ scroll: false, delay: 0.05 }}
			>
				The Archive
			</h1>
			<p class="mt-2 max-w-[58ch] leading-relaxed text-taupe">
				Every session gets a page. The tracklist, who was there, what everyone was working on, and
				the line that got screenshotted at 4am.
			</p>
		</div>
	</section>

	<ArchiveStats />

	<UpcomingSessions />

	<section class="mx-auto max-w-[1400px] px-5 py-10 md:py-14">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<h2 class="text-2xl font-semibold tracking-tight md:text-3xl" data-split use:splitReveal>
					The logbook
				</h2>
				<p class="num mt-1.5 text-xs text-faint">
					{filtered.length} of {nights.length} nights
				</p>
			</div>
			{#if hasFilters}
				<button class="btn btn-ghost btn-sm" onclick={reset}>Clear filters</button>
			{/if}
		</div>

		<div
			class="mt-6 grid gap-3 rounded-card border border-cream/10 bg-night/40 p-3 md:grid-cols-2 lg:grid-cols-4"
			data-reveal
			use:reveal={40}
		>
			<label class="relative block">
				<span class="sr-only">Search the archive</span>
				<IconSearch
					size={15}
					stroke={1.5}
					class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
				/>
				<input
					type="search"
					placeholder="Search tracks, people, notes..."
					class="w-full rounded-field border border-cream/10 bg-night/60 py-2 pl-9 pr-3 text-sm text-cream outline-none transition-colors placeholder:text-faint/80 focus:border-lamp/60"
					bind:value={query}
				/>
			</label>

			<label class="block">
				<span class="sr-only">Filter by date</span>
				<select
					class="w-full rounded-field border border-cream/10 bg-night/60 px-3 py-2 text-sm text-cream outline-none transition-colors focus:border-lamp/60"
					bind:value={month}
				>
					<option value="">Any date</option>
					{#each months as value (value)}
						<option value={value}>{monthLabel(value)}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="sr-only">Filter by contributor</span>
				<select
					class="w-full rounded-field border border-cream/10 bg-night/60 px-3 py-2 text-sm text-cream outline-none transition-colors focus:border-lamp/60"
					bind:value={contributor}
				>
					<option value="">Any contributor</option>
					{#each contributors() as person (person)}
						<option value={person}>{person}</option>
					{/each}
				</select>
			</label>

			<label class="block">
				<span class="sr-only">Filter by genre</span>
				<select
					class="w-full rounded-field border border-cream/10 bg-night/60 px-3 py-2 text-sm text-cream outline-none transition-colors focus:border-lamp/60"
					bind:value={genre}
				>
					<option value="">Any genre</option>
					{#each genres() as value (value)}
						<option value={value}>{value}</option>
					{/each}
				</select>
			</label>
		</div>

		<div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filtered as night, i (night.seed)}
				<a
					href="/archive/{night.slug}"
					class="group flex h-full flex-col overflow-hidden rounded-card bg-night ring-1 ring-cream/10 transition-colors hover:ring-lamp/40"
					data-reveal
					use:reveal={Math.min(i, 6) * 45}
				>
					<div class="relative overflow-hidden">
						<img
							src={asset(night.img)}
							alt=""
							width="800"
							height="500"
							loading="lazy"
							class="photo-warm aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
						/>
						<span class="num absolute left-3 top-3 rounded-full bg-night/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-lamp backdrop-blur">
							{night.tag}
						</span>
					</div>
					<div class="flex flex-1 flex-col p-5">
						<div class="num flex items-center justify-between gap-3 text-xs text-faint">
							<span>{night.date}</span>
							<span>{night.heads} awake</span>
						</div>
						<h3 class="mt-2.5 text-lg font-medium leading-snug">{night.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-taupe">{night.note}</p>
						{#if night.chatMoments[0]}
							<p class="zine-quote mt-3 line-clamp-2">{night.chatMoments[0].text}</p>
							<p class="num mt-1 text-[10px] text-faint">— {night.chatMoments[0].who} · {night.chatMoments[0].at}</p>
						{/if}
						<div class="num mt-auto flex items-center gap-4 pt-4 text-xs text-faint">
							<span>{night.hours}</span>
							<span>{night.tracks} tracks</span>
							<span class="ml-auto inline-flex items-center gap-1 text-taupe transition-colors group-hover:text-lamp">
								Read the night
								<IconChevronRight size={13} stroke={1.5} />
							</span>
						</div>
					</div>
				</a>
			{:else}
				<div class="panel col-span-full p-10 text-center">
					<p class="text-sm text-taupe">No nights match those filters.</p>
					<button class="btn btn-ghost btn-sm mt-4" onclick={reset}>Show everything</button>
				</div>
			{/each}
		</div>

		<div class="mt-10 flex items-center gap-2 border-t border-cream/10 pt-5 text-xs text-faint">
			<IconUsers size={14} stroke={1.5} />
			<span class="num">
				Looking for someone? Open any night and tap a name to see their all-nighter count.
			</span>
		</div>
	</section>
</main>

<footer class="border-t border-cream/10">
	<div class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-7">
		<p class="num text-xs text-faint">All Nighter · built between 1 and 6 am</p>
		<p class="num text-xs text-faint">keep the tab open</p>
	</div>
</footer>
