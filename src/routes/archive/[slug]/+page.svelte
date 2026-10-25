<script lang="ts">
	import { asset } from '$app/paths';
	import Nav from '#lib/components/Nav.svelte';
	import PlaylistExport from '#lib/components/PlaylistExport.svelte';
	import { reveal } from '#lib/reveal';
	import { splitReveal } from '#lib/split-reveal';
	import type { Night } from '#lib/data/archive';
	import type { PageData } from './$types';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import IconClock from '@tabler/icons-svelte/icons/clock';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconUsers from '@tabler/icons-svelte/icons/users';
	import IconFlame from '@tabler/icons-svelte/icons/flame';
	import IconMessage from '@tabler/icons-svelte/icons/message-2';
	import IconExternal from '@tabler/icons-svelte/icons/external-link';
	import IconDisc from '@tabler/icons-svelte/icons/disc';
	import IconTarget from '@tabler/icons-svelte/icons/target';

	let { data }: { data: PageData } = $props();
	const night = $derived(data.night);

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

	function sourceLabel(source: string | undefined): string {
		if (source === 'spotify') return 'Spotify';
		if (source === 'soundcloud') return 'SoundCloud';
		if (source === 'youtube') return 'YouTube';
		return 'link';
	}

	function trackHref(track: Night['tracklist'][number]): string | undefined {
		if (track.url) return track.url;
		if (track.videoId) return `https://www.youtube.com/watch?v=${track.videoId}`;
		return undefined;
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
			<div class="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
				<div>
					<span class="num rounded-full border border-lamp/30 bg-lamp/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-lamp">
						{night.tag}
					</span>
					<h1
						class="mt-3 text-3xl font-semibold leading-tight tracking-tight md:text-4xl"
						data-split
						use:splitReveal={{ scroll: false, delay: 0.05 }}
					>
						{night.title}
					</h1>
					<p class="num mt-2 text-sm text-taupe">{night.date}</p>
					<p class="mt-3 max-w-[62ch] leading-relaxed text-taupe">{night.note}</p>

					{#if night.chatMoments && night.chatMoments.length > 0}
						<div class="mt-4 max-w-[62ch] rounded-field border border-cream/10 bg-night/50 p-3.5">
							<p class="zine-quote">{night.chatMoments[0].text}</p>
							<p class="num mt-1 text-[10px] text-faint">— {night.chatMoments[0].who} · {night.chatMoments[0].at}</p>
						</div>
					{/if}

					<div class="mt-6 flex flex-wrap gap-2">
						<span class="num inline-flex items-center gap-1.5 rounded-full border border-cream/10 px-3 py-1 text-xs text-taupe">
							<IconClock size={13} stroke={1.5} class="text-lamp" />
							{night.hours}
						</span>
						<span class="num inline-flex items-center gap-1.5 rounded-full border border-cream/10 px-3 py-1 text-xs text-taupe">
							<IconMusic size={13} stroke={1.5} class="text-lamp" />
							{night.tracks} tracks
						</span>
						<span class="num inline-flex items-center gap-1.5 rounded-full border border-cream/10 px-3 py-1 text-xs text-taupe">
							<IconUsers size={13} stroke={1.5} class="text-lamp" />
							{night.heads} peak
						</span>
						<span class="num inline-flex items-center gap-1.5 rounded-full border border-cream/10 px-3 py-1 text-xs text-taupe">
							<IconDisc size={13} stroke={1.5} class="text-lamp" />
							{genre}
						</span>
					</div>
				</div>
				<img
					src={asset(night.img)}
					alt=""
					width="800"
					height="500"
					class="photo-warm hidden aspect-[16/10] w-full rounded-card object-cover ring-1 ring-cream/10 lg:block"
				/>
			</div>
		</div>
	</section>

	<section class="mx-auto max-w-[1400px] px-5 py-8 md:py-10">
		<div class="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
			<div class="min-w-0 space-y-4">
				<div class="panel overflow-hidden" data-reveal use:reveal>
					<div class="flex items-baseline justify-between border-b border-cream/10 px-5 py-4">
						<h2 class="text-lg font-medium">The set list</h2>
						<span class="num text-xs text-faint">{night.tracklist.length} logged</span>
					</div>
					<ol class="divide-y divide-cream/8">
						{#each night.tracklist as track, i (track.title + i)}
							<li class="flex items-center gap-3 px-5 py-3">
								<span class="num w-5 shrink-0 text-xs text-faint">{String(i + 1).padStart(2, '0')}</span>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm">
										{#if trackHref(track)}
											<a
												href={trackHref(track)}
												target="_blank"
												rel="noreferrer"
												class="inline-flex items-center gap-1.5 transition-colors hover:text-lamp"
											>
												{track.title}
												<IconExternal size={12} stroke={1.5} class="text-faint" />
											</a>
										{:else}
											{track.title}
										{/if}
									</p>
									<p class="truncate text-xs text-faint">
										{track.artist}
										<span class="text-faint/70">·</span>
										{track.genre}
										<span class="text-faint/70">·</span>
										added by
										<a href="/crew/{track.addedBy}" class="text-taupe hover:text-lamp">{track.addedBy}</a>
									</p>
									{#if track.note}
										<p class="mt-0.5 truncate text-[11px] italic text-faint/80">“{track.note}”</p>
									{/if}
								</div>
								<span class="num shrink-0 rounded-full border border-cream/10 px-2 py-0.5 text-[11px] text-taupe">
									{sourceLabel(track.source)}
								</span>
								<span class="num flex w-10 shrink-0 items-center justify-end gap-1 text-xs text-faint">
									<IconFlame size={12} stroke={1.5} class={track.reactions ? 'text-lamp' : ''} />
									{track.reactions ?? 0}
								</span>
							</li>
						{/each}
					</ol>
				</div>

				<div class="grid gap-4 sm:grid-cols-2" data-reveal use:reveal={60}>
					{#if topTrack}
						<div class="panel p-5">
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

					<div class="panel p-5">
						<p class="flex items-center gap-1.5 text-xs text-faint">
							<IconMessage size={14} stroke={1.5} class="text-lamp" />
							Memorable moments
						</p>
						<ul class="mt-2.5 space-y-2.5">
							{#each night.chatMoments as moment (moment.text)}
								<li class="text-sm leading-relaxed">
									<p class="flex items-baseline gap-2 text-xs">
										<a href="/crew/{moment.who}" class="text-taupe hover:text-lamp">{moment.who}</a>
										<span class="num text-[10px] text-faint">{moment.at}</span>
									</p>
									<p class="text-cream/90">“{moment.text}”</p>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>

			<aside class="min-w-0 space-y-4" data-reveal use:reveal={120}>
				<PlaylistExport {night} />

				<div class="panel p-5">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-medium">Who was there</h3>
						<span class="num text-xs text-faint">{night.joined.length}</span>
					</div>
					<ul class="mt-3 flex flex-wrap gap-1.5">
						{#each night.joined as person (person)}
							<li>
								<a
									href="/crew/{person}"
									class="inline-flex items-center gap-1.5 rounded-full bg-night/60 py-1 pl-1 pr-2.5 text-sm ring-1 ring-cream/10 transition-colors hover:ring-lamp/50"
								>
									<span class="grid h-6 w-6 place-items-center rounded-full bg-lamp/15 text-[11px] font-semibold text-lamp">
										{person.charAt(0).toUpperCase()}
									</span>
									<span class="text-taupe">{person}</span>
								</a>
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
