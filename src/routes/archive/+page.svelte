<script lang="ts">
	import { onMount } from 'svelte';
	import Nav from '#lib/components/Nav.svelte';
	import ArchiveStats from '#lib/components/ArchiveStats.svelte';
	import { nights, genres, contributors } from '#lib/data/archive';
	import type { Night } from '#lib/data/archive';
	import { loadMyNights, dbArchiveToNight, isTestArchiveSlug } from '#lib/data/local-logbook';
	import { supabase } from '#lib/supabase';
	import { auth } from '#lib/auth.svelte';
	import { reveal } from '#lib/reveal';
	import { splitReveal } from '#lib/split-reveal';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import IconSearch from '@tabler/icons-svelte/icons/search';
	import IconUsers from '@tabler/icons-svelte/icons/users';
	import IconClock from '@tabler/icons-svelte/icons/clock';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconChevronRight from '@tabler/icons-svelte/icons/chevron-right';
	import IconChevronDown from '@tabler/icons-svelte/icons/chevron-down';
	import IconX from '@tabler/icons-svelte/icons/x';

	const ITEMS_PER_ROW = 3;
	const INITIAL_ROWS = 2;
	const ITEMS_PER_PAGE = ITEMS_PER_ROW * INITIAL_ROWS; // 6 items (2 rows in 3-column grid)
	let visibleCount = $state(ITEMS_PER_PAGE);

	let query = $state('');
	let contributor = $state('');
	let genre = $state('');
	let month = $state('');
	let sourceTab = $state<'all' | 'curated' | 'my'>('all');
	let myLocalNights = $state<Night[]>([]);
	let dbNights = $state<Night[]>([]);

	async function loadDbArchives(): Promise<void> {
		if (!supabase) return;
		try {
			// Fetch from session_archives as the single source of truth for past lock-in archives
			const { data: archives } = await supabase
				.from('session_archives')
				.select('*')
				.order('ended_at', { ascending: false });

			const loaded: Night[] = [];
			const seenSlugs = new Set<string>();

			if (archives && archives.length > 0) {
				for (const a of archives) {
					if (!seenSlugs.has(a.slug) && !isTestArchiveSlug(a.slug)) {
						seenSlugs.add(a.slug);
						loaded.push(dbArchiveToNight(a));
					}
				}
			}

			dbNights = loaded;
		} catch (err) {
			console.warn('[Archive] Failed to load db archives:', err);
		}
	}

	onMount(() => {
		myLocalNights = loadMyNights();
		void loadDbArchives();
	});

	const allNights = $derived.by(() => {
		const result: Night[] = [];
		for (const item of [...dbNights, ...myLocalNights, ...nights]) {
			if (isTestArchiveSlug(item.slug)) continue;
			// Deduplicate: if an entry for this room base name already exists for this date, pick the richer one
			const base = item.slug.replace(/-\d{4}-\d{2}-\d{2}$/, '');
			const existingIndex = result.findIndex(
				(r) => r.slug === item.slug || (r.slug.replace(/-\d{4}-\d{2}-\d{2}$/, '') === base && r.date === item.date)
			);
			if (existingIndex !== -1) {
				const existing = result[existingIndex];
				// Merge attendee rosters so no participant (e.g. Bisrat) is ever dropped
				const mergedJoined = Array.from(new Set([...(existing.joined || []), ...(item.joined || [])]));
				const attendeeMap = new Map<string, any>();
				for (const a of [...(existing.attendees || []), ...(item.attendees || [])]) {
					if (a && a.name) attendeeMap.set(a.name.toLowerCase(), a);
				}
				const mergedAttendees = Array.from(attendeeMap.values());
				const richerItem = (item.tracks || 0) >= (existing.tracks || 0) ? item : existing;

				result[existingIndex] = {
					...richerItem,
					joined: mergedJoined,
					attendees: mergedAttendees,
					heads: Math.max(mergedJoined.length, richerItem.heads || 1)
				};
			} else {
				result.push(item);
			}
		}
		return result.sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime());
	});

	const myNights = $derived.by(() => {
		const currentName = (auth.displayName || '').trim().toLowerCase();
		const seen = new Set<string>();
		const result: Night[] = [];

		for (const n of allNights) {
			if (isTestArchiveSlug(n.slug)) continue;
			const isMine =
				myLocalNights.some((ln) => ln.slug === n.slug || ln.slug.startsWith(n.slug)) ||
				(currentName && (
					n.joined.some((name) => name.trim().toLowerCase() === currentName) ||
					n.tracklist.some((t) => t.addedBy.trim().toLowerCase() === currentName)
				));
			if (isMine && !seen.has(n.slug)) {
				seen.add(n.slug);
				result.push(n);
			}
		}

		return result.length > 0 ? result : allNights;
	});

	const baseNights = $derived.by(() => {
		if (sourceTab === 'my') return myNights.length > 0 ? myNights : allNights;
		if (sourceTab === 'curated') return nights;
		return allNights;
	});

	const months = $derived(
		[...new Set(baseNights.map((night) => night.iso.slice(0, 7)))].sort().reverse()
	);

	const availableContributors = $derived.by(() => {
		const set = new Set<string>();
		for (const night of baseNights) {
			for (const person of night.joined) set.add(person);
			for (const track of night.tracklist) set.add(track.addedBy);
		}
		return [...set].sort();
	});

	const availableGenres = $derived.by(() => {
		const set = new Set<string>();
		for (const night of baseNights) {
			for (const track of night.tracklist) set.add(track.genre);
		}
		return [...set].sort();
	});

	function monthLabel(value: string): string {
		const [year, m] = value.split('-');
		const date = new Date(Number(year), Number(m) - 1, 1);
		return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return [...baseNights]
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
			.sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime());
	});

	const displayedNights = $derived(filtered.slice(0, visibleCount));

	$effect(() => {
		// Reset visible count when query, filters, or tab changes
		query;
		contributor;
		genre;
		month;
		sourceTab;
		visibleCount = ITEMS_PER_PAGE;
	});

	function reset(): void {
		query = '';
		contributor = '';
		genre = '';
		month = '';
		visibleCount = ITEMS_PER_PAGE;
	}

	const hasFilters = $derived(!!(query || contributor || genre || month));

	const chronologicalNights = $derived.by(() => {
		return [...baseNights].sort(
			(a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime()
		);
	});

	function getLogNumber(targetNight: Night): number {
		const idx = chronologicalNights.findIndex(
			(n) => n.slug === targetNight.slug || n.iso === targetNight.iso
		);
		return idx !== -1 ? idx + 1 : 1;
	}
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
			<p class="eyebrow mt-4">{allNights.length} {allNights.length === 1 ? 'night' : 'nights'} on record</p>
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

	<ArchiveStats nightsList={allNights} />

	<section class="relative border-t border-cream/10 bg-[#060a0b] py-14 md:py-20 overflow-hidden">
		<!-- Subtle dot ledger pattern -->
		<div class="pointer-events-none absolute inset-0 opacity-25" style="background-image: radial-gradient(rgba(131, 249, 214, 0.15) 1px, transparent 1px); background-size: 24px 24px;"></div>
		<!-- Ambient top gradient divider line -->
		<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lamp/40 to-transparent"></div>

		<div class="relative mx-auto max-w-[1400px] px-5">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<span class="num inline-flex items-center gap-1.5 rounded bg-lamp/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-lamp border border-lamp/30 mb-2">
						<span class="h-1 w-1 rounded-full bg-lamp"></span>
						SESSION RECORDS
					</span>
					<h2 class="text-2xl font-semibold tracking-tight md:text-3xl text-cream" data-split use:splitReveal>
						The logbook
					</h2>
					<p class="num mt-1.5 text-xs text-faint">
						{filtered.length} of {baseNights.length} {baseNights.length === 1 ? 'night' : 'nights'} on record
					</p>
				</div>

			<div class="flex flex-wrap items-center gap-2">
				<div class="flex items-center gap-1 rounded-full border border-cream/10 bg-night/60 p-1 text-xs">
					<button
						type="button"
						class="rounded-full px-3 py-1 transition-colors {sourceTab === 'all' ? 'bg-lamp/20 font-medium text-lamp' : 'text-taupe hover:text-cream'}"
						onclick={() => (sourceTab = 'all')}
					>
						All ({allNights.length})
					</button>
					<button
						type="button"
						class="rounded-full px-3 py-1 transition-colors {sourceTab === 'curated' ? 'bg-lamp/20 font-medium text-lamp' : 'text-taupe hover:text-cream'}"
						onclick={() => (sourceTab = 'curated')}
					>
						Curated ({nights.length})
					</button>
					<button
						type="button"
						class="rounded-full px-3 py-1 transition-colors {sourceTab === 'my' ? 'bg-amber/20 font-medium text-amber' : 'text-taupe hover:text-cream'}"
						onclick={() => (sourceTab = 'my')}
					>
						My Logbook ({myNights.length})
					</button>
				</div>

				{#if hasFilters}
					<button class="btn btn-ghost btn-sm" onclick={reset}>Clear filters</button>
				{/if}
			</div>
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
					class="w-full rounded-field border border-cream/10 bg-night/60 py-2 pl-9 pr-8 text-sm text-cream outline-none transition-colors placeholder:text-faint/80 focus:border-lamp/60"
					bind:value={query}
				/>
				{#if query}
					<button
						type="button"
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-cream transition-colors"
						onclick={() => (query = '')}
						title="Clear search query"
						aria-label="Clear search query"
					>
						<IconX size={14} stroke={2} />
					</button>
				{/if}
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
					{#each availableContributors as person (person)}
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
					{#each availableGenres as value (value)}
						<option value={value}>{value}</option>
					{/each}
				</select>
			</label>
		</div>

		{#if hasFilters}
			<div class="mt-3 flex flex-wrap items-center gap-2">
				<span class="text-[11px] text-faint uppercase font-mono tracking-wider">Filtered by:</span>
				{#if query}
					<button
						type="button"
						class="inline-flex items-center gap-1.5 rounded-full border border-lamp/30 bg-lamp/10 px-2.5 py-0.5 text-xs text-lamp hover:bg-lamp/15 transition-colors"
						onclick={() => (query = '')}
						title="Remove search filter"
					>
						<span>"{query}"</span>
						<IconX size={12} stroke={2} />
					</button>
				{/if}
				{#if month}
					<button
						type="button"
						class="inline-flex items-center gap-1.5 rounded-full border border-lamp/30 bg-lamp/10 px-2.5 py-0.5 text-xs text-lamp hover:bg-lamp/15 transition-colors"
						onclick={() => (month = '')}
						title="Remove date filter"
					>
						<span>{monthLabel(month)}</span>
						<IconX size={12} stroke={2} />
					</button>
				{/if}
				{#if contributor}
					<button
						type="button"
						class="inline-flex items-center gap-1.5 rounded-full border border-lamp/30 bg-lamp/10 px-2.5 py-0.5 text-xs text-lamp hover:bg-lamp/15 transition-colors"
						onclick={() => (contributor = '')}
						title="Remove contributor filter"
					>
						<span>@{contributor}</span>
						<IconX size={12} stroke={2} />
					</button>
				{/if}
				{#if genre}
					<button
						type="button"
						class="inline-flex items-center gap-1.5 rounded-full border border-lamp/30 bg-lamp/10 px-2.5 py-0.5 text-xs text-lamp hover:bg-lamp/15 transition-colors"
						onclick={() => (genre = '')}
						title="Remove genre filter"
					>
						<span>genre: {genre}</span>
						<IconX size={12} stroke={2} />
					</button>
				{/if}
				<button
					type="button"
					class="text-xs text-faint hover:text-cream transition-colors underline underline-offset-2 ml-1"
					onclick={reset}
				>
					Reset all
				</button>
			</div>
		{/if}

		<div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each displayedNights as night, i (night.seed)}
				<a
					href="/archive/{night.slug}"
					class="group relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-cream/10 bg-night-2 p-5 transition-all duration-300 hover:border-lamp/50 hover:bg-night-2/90"
				>
					<!-- Notebook spine accent -->
					<div class="absolute left-0 top-0 bottom-0 w-1 bg-cyber-teal group-hover:w-1.5 transition-all"></div>

					<!-- Watermark Serial Index Number -->
					<span class="pointer-events-none absolute right-4 top-2 font-mono text-4xl font-extrabold text-cream/[0.04] select-none group-hover:text-lamp/[0.08] transition-colors">
						{String(getLogNumber(night)).padStart(2, '0')}
					</span>

					<div>
						<!-- Top Bar: Index Tag & Date -->
						<div class="flex items-center justify-between gap-2 border-b border-cream/10 pb-3 pl-1">
							<div class="flex items-center gap-2">
								<span class="inline-flex items-center gap-1.5 rounded bg-lamp/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-lamp border border-lamp/30">
									<span class="h-1 w-1 rounded-full bg-lamp"></span>
									{night.tag}
								</span>
								<span class="font-mono text-[10px] uppercase tracking-wider text-faint">
									LOG #{String(getLogNumber(night)).padStart(3, '0')}
								</span>
							</div>
							<span class="font-mono text-xs text-taupe">{night.date}</span>
						</div>

						<!-- Title & Note -->
						<div class="pt-3.5 pl-1">
							<h3 class="text-lg font-semibold tracking-tight text-cream group-hover:text-lamp transition-colors leading-snug">
								{night.title}
							</h3>
							<p class="mt-2 text-xs leading-relaxed text-taupe line-clamp-2">
								{night.note}
							</p>
						</div>
					</div>

					<!-- Bottom Ledger Metrics Strip -->
					<div class="mt-5 border-t border-cream/8 pt-3.5 pl-1">
						<div class="flex items-center justify-between gap-2 font-mono text-[11px] text-faint">
							<div class="flex items-center gap-3">
								<span class="inline-flex items-center gap-1">
									<IconClock size={12} stroke={1.5} class="text-amber" />
									<span class="text-amber/90">{night.hours}</span>
								</span>
								<span class="inline-flex items-center gap-1">
									<IconMusic size={12} stroke={1.5} class="text-lamp" />
									<span class="text-cream/80">{night.tracks} tracks</span>
								</span>
								<span class="inline-flex items-center gap-1 hidden sm:inline-flex">
									<IconUsers size={12} stroke={1.5} class="text-amber-200/80" />
									<span class="text-cream/80">{night.heads}</span>
								</span>
							</div>
							<span class="inline-flex items-center gap-1 text-taupe font-sans text-xs group-hover:text-lamp transition-colors shrink-0">
								<span>Inspect</span>
								<IconChevronRight size={13} stroke={1.5} class="transition-transform group-hover:translate-x-0.5" />
							</span>
						</div>
					</div>
				</a>
			{:else}
				<div class="panel col-span-full p-10 text-center">
					{#if sourceTab === 'my' && myNights.length === 0}
						<p class="text-sm font-medium text-cream">Your personal logbook is empty.</p>
						<p class="mx-auto mt-1.5 max-w-[44ch] text-xs leading-relaxed text-taupe">
							When an all-nighter finishes at sunrise, tap "Save to My Logbook" in the Sunrise Ritual to preserve your session right here!
						</p>
						<button class="btn btn-ghost btn-sm mt-4" onclick={() => (sourceTab = 'curated')}>
							View curated nights
						</button>
					{:else}
						<p class="text-sm text-taupe">No nights match those filters.</p>
						<button class="btn btn-ghost btn-sm mt-4" onclick={reset}>Show everything</button>
					{/if}
				</div>
			{/each}
		</div>

		{#if filtered.length > visibleCount}
			<div class="mt-8 flex flex-col items-center justify-center gap-2">
				<button
					type="button"
					class="btn btn-secondary flex items-center gap-2 px-6 py-2.5 text-xs font-mono uppercase tracking-wider text-cream hover:border-lamp/40 hover:text-lamp transition-all cursor-pointer shadow-md"
					onclick={() => (visibleCount += ITEMS_PER_PAGE)}
				>
					<span>Show more</span>
					<span class="rounded bg-cream/10 px-1.5 py-0.5 text-[10px] text-faint">
						+{Math.min(ITEMS_PER_PAGE, filtered.length - visibleCount)}
					</span>
					<IconChevronDown size={14} stroke={2} />
				</button>
				<p class="font-mono text-[11px] text-faint">
					Showing {visibleCount} of {filtered.length} sessions
				</p>
			</div>
		{/if}

		<div class="mt-10 flex items-center gap-2 border-t border-cream/10 pt-5 text-xs text-faint">
			<IconUsers size={14} stroke={1.5} />
			<span class="num">
				Looking for someone? Open any night and tap a name to see their all-nighter count.
			</span>
		</div>
	</div>
</section>
</main>

<footer class="border-t border-cream/10">
	<div class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-7">
		<p class="num text-xs text-faint">All Nighter · built between 1 and 6 am</p>
		<p class="num text-xs text-faint">keep the tab open</p>
	</div>
</footer>
