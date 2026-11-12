<script lang="ts">
	import { onMount } from 'svelte';
	import Nav from '#lib/components/Nav.svelte';
	import PlaylistExport from '#lib/components/PlaylistExport.svelte';
	import { reveal } from '#lib/reveal';
	import { splitReveal } from '#lib/split-reveal';
	import { nights, type Night } from '#lib/data/archive';
	import { loadMyNights } from '#lib/data/local-logbook';
	import { getAvatarForPerson } from '#lib/avatars';
	import type { PageData } from './$types';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import IconClock from '@tabler/icons-svelte/icons/clock';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconUsers from '@tabler/icons-svelte/icons/users';
	import IconFlame from '@tabler/icons-svelte/icons/flame';
	import IconExternal from '@tabler/icons-svelte/icons/external-link';
	import IconDisc from '@tabler/icons-svelte/icons/disc';
	import IconTarget from '@tabler/icons-svelte/icons/target';
	import IconChevronDown from '@tabler/icons-svelte/icons/chevron-down';
	import IconChevronUp from '@tabler/icons-svelte/icons/chevron-up';

	let { data }: { data: PageData } = $props();
	const night = $derived(data.night);

	let myNights = $state<Night[]>([]);
	onMount(() => {
		myNights = loadMyNights();
	});

	const logNumber = $derived.by(() => {
		const combined = [...nights];
		for (const mn of myNights) {
			if (!combined.some((n) => n.slug === mn.slug)) combined.push(mn);
		}
		combined.sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());
		const idx = combined.findIndex((n) => n.slug === night.slug || n.iso === night.iso);
		return idx !== -1 ? idx + 1 : 1;
	});

	const genre = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const track of night.tracklist) {
			counts.set(track.genre, (counts.get(track.genre) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
	});

	const topTrack = $derived(
		[...night.tracklist].sort((a, b) => (b.reactions ?? 0) - (a.reactions ?? 0))[0]
	);

	let visibleCount = $state(10);
	const visibleTracklist = $derived(night.tracklist.slice(0, visibleCount));
	const hasMoreTracks = $derived(night.tracklist.length > visibleCount);

	function sourceLabel(track: Night['tracklist'][number]): string {
		if (track.source === 'spotify') return 'Spotify';
		if (track.source === 'soundcloud') return 'SoundCloud';
		if (track.source === 'youtube' || track.videoId) return 'YouTube';
		if (track.url) {
			try {
				const host = new URL(track.url).hostname.replace('www.', '');
				if (host.includes('spotify')) return 'Spotify';
				if (host.includes('soundcloud')) return 'SoundCloud';
				if (host.includes('youtube') || host.includes('youtu.be')) return 'YouTube';
			} catch {}
		}
		return 'YouTube';
	}

	function trackHref(track: Night['tracklist'][number]): string {
		if (track.url && track.url.trim()) return track.url.trim();
		if (track.videoId && track.videoId.trim()) {
			return `https://www.youtube.com/watch?v=${encodeURIComponent(track.videoId.trim())}`;
		}
		const query = `${track.artist} ${track.title}`.trim();
		return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
	}
</script>

<svelte:head>
	<title>{night.title} · Archive · All Nighter</title>
</svelte:head>

<Nav />

<main>
	<section class="border-b border-cream/10 bg-night-2">
		<div class="mx-auto max-w-[1400px] px-5 py-10 md:py-12">
			<a href="/archive" class="inline-flex items-center gap-1.5 text-sm text-taupe transition-colors hover:text-cream">
				<IconArrowLeft size={15} stroke={1.5} />
				The Archive
			</a>
			<div class="mt-6 relative max-w-4xl rounded-2xl border border-cream/10 bg-night-2 p-6 sm:p-8 overflow-hidden">
				<div class="absolute left-0 top-0 bottom-0 w-1.5 bg-cyber-teal"></div>

				<div class="flex items-center justify-between gap-3 border-b border-cream/10 pb-4 pl-1">
					<div class="flex items-center gap-2.5">
						<span class="num inline-flex items-center gap-1.5 rounded bg-lamp/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-lamp border border-lamp/30">
							<span class="h-1 w-1 rounded-full bg-lamp"></span>
							{night.tag}
						</span>
						<span class="num text-[11px] uppercase tracking-wider text-faint">
							LOG #{String(logNumber).padStart(3, '0')}
						</span>
					</div>
					<p class="num text-xs text-taupe">{night.date}</p>
				</div>

				<div class="pt-4 pl-1">
					<h1
						class="text-3xl font-semibold leading-tight tracking-tight md:text-4xl text-cream"
						data-split
						use:splitReveal={{ scroll: false, delay: 0.05 }}
					>
						{night.title}
					</h1>
					<p class="mt-3 max-w-[62ch] text-sm leading-relaxed text-taupe">{night.note}</p>

					<div class="mt-6 flex flex-wrap gap-2.5 pt-5 border-t border-cream/5 font-mono">
						<span class="inline-flex items-center gap-1.5 rounded-full border border-cream/10 bg-night/60 px-3 py-1 text-xs text-taupe">
							<IconClock size={13} stroke={1.5} class="text-amber" />
							<span class="text-cream/90">{night.hours}</span>
						</span>
						<span class="inline-flex items-center gap-1.5 rounded-full border border-cream/10 bg-night/60 px-3 py-1 text-xs text-taupe">
							<IconMusic size={13} stroke={1.5} class="text-lamp" />
							<span class="text-cream/90">{night.tracks} tracks</span>
						</span>
						<span class="inline-flex items-center gap-1.5 rounded-full border border-cream/10 bg-night/60 px-3 py-1 text-xs text-taupe">
							<IconUsers size={13} stroke={1.5} class="text-amber-200" />
							<span class="text-cream/90">{night.heads} peak awake</span>
						</span>
						<span class="inline-flex items-center gap-1.5 rounded-full border border-cream/10 bg-night/60 px-3 py-1 text-xs text-taupe">
							<IconDisc size={13} stroke={1.5} class="text-lamp" />
							<span class="text-cream/90">{genre}</span>
						</span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="mx-auto max-w-[1400px] px-5 py-8 md:py-10">
		<div class="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
			<div class="min-w-0 space-y-4">
				<div class="panel overflow-hidden" data-reveal use:reveal>
					<div class="flex items-baseline justify-between border-b border-cream/10 px-5 py-4">
						<h2 class="text-lg font-medium">The set list</h2>
						<span class="num text-xs text-faint">
							{#if night.tracklist.length > 10}
								Showing {visibleTracklist.length} of {night.tracklist.length} logged
							{:else}
								{night.tracklist.length} logged
							{/if}
						</span>
					</div>
					<ol class="divide-y divide-cream/8">
						{#each visibleTracklist as track, i (track.title + i)}
							<li class="flex items-center gap-3 px-5 py-3 hover:bg-cream/[0.02] transition-colors">
								<span class="num w-5 shrink-0 text-xs text-faint">{String(i + 1).padStart(2, '0')}</span>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm">
										<a
											href={trackHref(track)}
											target="_blank"
											rel="noreferrer noopener"
											class="inline-flex items-center gap-1.5 transition-colors hover:text-lamp font-medium"
											title="Listen to {track.title}"
										>
											<span>{track.title}</span>
											<IconExternal size={12} stroke={1.5} class="text-faint hover:text-lamp" />
										</a>
									</p>
									<p class="truncate text-xs text-faint">
										{track.artist}
										<span class="text-faint/70">·</span>
										{track.genre}
										<span class="text-faint/70">·</span>
										added by
										{#if track.addedBy && track.addedBy.toLowerCase() !== 'autoplay'}
											<button
												type="button"
												class="text-taupe hover:text-lamp transition-colors cursor-pointer underline-offset-2 hover:underline inline"
												onclick={() => {
													window.dispatchEvent(
														new CustomEvent('an:inspect-peer', {
															detail: { name: track.addedBy }
														})
													);
												}}
											>
												{track.addedBy}
											</button>
										{:else}
											<span class="text-taupe">{track.addedBy}</span>
										{/if}
									</p>
									{#if track.note}
										<p class="mt-0.5 truncate text-[11px] italic text-faint/80">“{track.note}”</p>
									{/if}
								</div>
								<!-- Right side clickable link button -->
								<a
									href={trackHref(track)}
									target="_blank"
									rel="noreferrer noopener"
									class="num shrink-0 rounded-full border border-cream/15 bg-night-2/80 px-2.5 py-1 text-[11px] text-taupe hover:text-lamp hover:border-lamp/40 hover:bg-lamp/10 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm group/btn"
									title="Open in {sourceLabel(track)}"
									aria-label="Open in {sourceLabel(track)}"
								>
									<span>{sourceLabel(track)}</span>
									<IconExternal size={11} stroke={1.8} class="text-faint group-hover/btn:text-lamp transition-colors" />
								</a>
								<span class="num flex w-10 shrink-0 items-center justify-end gap-1 text-xs text-faint">
									<IconFlame size={12} stroke={1.5} class={track.reactions ? 'text-lamp' : ''} />
									{track.reactions ?? 0}
								</span>
							</li>
						{/each}
					</ol>

					{#if night.tracklist.length > 10}
						<div class="border-t border-cream/8 p-3 text-center bg-night-2/40">
							{#if hasMoreTracks}
								<button
									type="button"
									class="btn btn-secondary btn-sm text-xs font-mono text-taupe hover:text-lamp hover:border-lamp/40 transition-all cursor-pointer py-2 px-4 rounded-lg inline-flex items-center gap-2 border border-cream/15 bg-[#141c1f]"
									onclick={() => (visibleCount += 10)}
								>
									<IconChevronDown size={14} stroke={2} />
									<span>Show more ({night.tracklist.length - visibleCount} remaining)</span>
								</button>
							{:else}
								<div class="flex items-center justify-center gap-3">
									<span class="text-xs font-mono text-faint">All {night.tracklist.length} tracks displayed</span>
									<button
										type="button"
										class="text-xs font-mono text-taupe hover:text-lamp inline-flex items-center gap-1 cursor-pointer transition-colors hover:underline"
										onclick={() => (visibleCount = 10)}
									>
										<IconChevronUp size={13} stroke={2} />
										<span>Show less</span>
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>

				{#if topTrack}
					<div class="panel p-5" data-reveal use:reveal={60}>
						<p class="flex items-center gap-1.5 text-xs text-faint">
							<IconFlame size={14} stroke={1.5} class="text-lamp" />
							Most reacted track
						</p>
						<p class="mt-2 text-base font-medium leading-snug">{topTrack.title}</p>
						<p class="mt-1 text-sm text-taupe">{topTrack.artist}</p>
						<p class="num mt-3 text-xs text-faint">
							{topTrack.reactions ?? 0} reactions · added by {topTrack.addedBy}
						</p>
					</div>
				{/if}
			</div>

			<aside class="min-w-0 space-y-4" data-reveal use:reveal={120}>
				<PlaylistExport {night} />

				<div class="panel p-5">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-medium">Who was there</h3>
						<span class="num text-xs text-faint">{night.joined.length}</span>
					</div>
					<ul class="mt-3 flex flex-wrap gap-2">
						{#each night.joined as person (person)}
							{@const customAvatar = night.attendees?.find((a) => a.name.trim().toLowerCase() === person.trim().toLowerCase())?.avatar}
							{@const avatarUrl = getAvatarForPerson(person, customAvatar, night.slug)}
							<li>
								<button
									type="button"
									onclick={() => {
										window.dispatchEvent(
											new CustomEvent('an:inspect-peer', {
												detail: { name: person, avatar: customAvatar || avatarUrl }
											})
										);
									}}
									title="Inspect {person}'s callsign profile"
									class="inline-flex items-center gap-2 rounded-full bg-night/70 py-1 pl-1 pr-3 text-xs ring-1 ring-cream/15 transition-all hover:ring-lamp/50 hover:bg-night group cursor-pointer"
								>
									<span class="relative grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full border border-cream/20 bg-[#0a1012]">
										<img
											src={avatarUrl}
											alt={person}
											class="h-full w-full object-cover"
											onerror={(e) => {
												(e.currentTarget as HTMLElement).style.display = 'none';
												const fallback = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement;
												if (fallback) fallback.style.display = 'grid';
											}}
										/>
										<span class="hidden h-full w-full place-items-center bg-lamp/15 text-[10px] font-semibold text-lamp">
											{person.charAt(0).toUpperCase()}
										</span>
									</span>
									<span class="text-taupe group-hover:text-cream transition-colors">{person}</span>
								</button>
							</li>
						{/each}
					</ul>
				</div>

				{#if night.intentions && night.intentions.length > 0}
					<div class="panel p-5">
						<div class="flex items-center justify-between">
							<h3 class="text-sm font-medium flex items-center gap-1.5">
								<IconTarget size={14} stroke={1.5} class="text-lamp" />
								What the room worked on
							</h3>
							<span class="num text-xs text-faint">{night.intentions.length}</span>
						</div>
						<ul class="mt-3 space-y-2">
							{#each night.intentions as intention}
								<li class="flex items-start gap-2 text-xs leading-relaxed text-taupe">
									<span class="mt-1.5 h-1 w-1 rounded-full bg-lamp shrink-0"></span>
									<span>{intention}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				<div class="panel p-5">
					<h3 class="text-sm font-medium">Night notes</h3>
					<dl class="mt-3 space-y-2 text-xs">
						<div class="flex items-center justify-between gap-3">
							<dt class="text-faint">Peak listeners</dt>
							<dd class="num text-taupe">{night.heads}</dd>
						</div>
						<div class="flex items-center justify-between gap-3">
							<dt class="text-faint">Minutes awake</dt>
							<dd class="num text-taupe">{night.minutes}</dd>
						</div>
						<div class="flex items-center justify-between gap-3">
							<dt class="text-faint">Main genre</dt>
							<dd class="num text-taupe">{genre}</dd>
						</div>
						<div class="flex items-center justify-between gap-3">
							<dt class="text-faint">Contributors</dt>
							<dd class="num text-taupe">{new Set(night.tracklist.map((t) => t.addedBy)).size}</dd>
						</div>
					</dl>
					<a href="/room" class="btn btn-ghost btn-sm mt-4 w-full">
						<IconUsers size={14} stroke={1.5} />
						Step into tonight's room
					</a>
				</div>
			</aside>
		</div>
	</section>
</main>

<footer class="border-t border-cream/10">
	<div class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-7">
		<p class="num text-xs text-faint">All Nighter · built between 1 and 6 am</p>
		<p class="num text-xs text-faint">keep the tab open</p>
	</div>
</footer>
