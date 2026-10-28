<script lang="ts">
	import { room, parseTrackUrl } from '#lib/room/room.svelte';
	import { crate } from '#lib/data/crate';
	import { parseYouTubeId, fetchVideoMeta, thumbnailFor, fetchSpotifyMeta, searchYouTubeVideo } from '#lib/room/youtube';
	import IconPlus from '@tabler/icons-svelte/icons/plus';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconPlay from '@tabler/icons-svelte/icons/player-play';
	import IconAlert from '@tabler/icons-svelte/icons/alert-triangle';
	import IconChevronUp from '@tabler/icons-svelte/icons/chevron-up';
	import IconChevronDown from '@tabler/icons-svelte/icons/chevron-down';
	import IconDisc from '@tabler/icons-svelte/icons/disc';
	import IconThumbUp from '@tabler/icons-svelte/icons/thumb-up';

	let draft = $state('');
	let dedicationDraft = $state('');
	let tagDraft = $state<'focus' | 'hangout'>('focus');
	let filterTag = $state<'all' | 'focus' | 'hangout'>('all');
	let busy = $state(false);
	let error = $state('');
	let showCrate = $state(false);

	async function submit(e: Event): Promise<void> {
		e.preventDefault();
		error = '';
		const parsed = parseTrackUrl(draft);
		const ded = dedicationDraft.trim() || undefined;
		const tag = tagDraft;

		if (parsed.source === 'youtube' && parsed.id) {
			busy = true;
			const meta = await fetchVideoMeta(parsed.id);
			busy = false;
			const title = meta?.title ?? `YouTube track (${parsed.id})`;
			const channel = meta?.channel ?? 'YouTube';
			room.add(parsed.id, title, channel, room.name, 'youtube', draft.trim(), ded, tag);
			draft = '';
			dedicationDraft = '';
			return;
		}
		if (parsed.source === 'spotify' || draft.includes('spotify.com')) {
			busy = true;
			try {
				const spotMeta = await fetchSpotifyMeta(draft.trim());
				if (spotMeta?.title) {
					const match = await searchYouTubeVideo(spotMeta.title);
					busy = false;
					if (match?.videoId) {
						room.add(match.videoId, spotMeta.title, match.channel, room.name, 'youtube', draft.trim(), ded, tag);
						draft = '';
						dedicationDraft = '';
						return;
					}
					// Fallback if search failed
					room.add(parsed.id ?? null, spotMeta.title, 'Spotify', room.name, 'spotify', draft.trim(), ded, tag);
					draft = '';
					dedicationDraft = '';
					return;
				}
			} catch {}
			busy = false;
			error = 'Could not resolve that Spotify track. Check link or paste YouTube URL.';
			return;
		}
		if (parsed.source === 'soundcloud') {
			const title = `SoundCloud (${parsed.id})`;
			const channel = 'SoundCloud';
			room.add(null, title, channel, room.name, 'soundcloud', draft.trim(), ded, tag);
			draft = '';
			dedicationDraft = '';
			return;
		}
		const id = parseYouTubeId(draft);
		if (id) {
			busy = true;
			const meta = await fetchVideoMeta(id);
			busy = false;
			const title = meta?.title ?? `YouTube track (${id})`;
			const channel = meta?.channel ?? 'YouTube';
			room.add(id, title, channel, room.name, 'youtube', draft.trim(), ded, tag);
			draft = '';
			dedicationDraft = '';
			return;
		}
		error = 'Paste a Spotify, YouTube, or SoundCloud link.';
	}

	function startPick(pick: (typeof crate)[number]): void {
		const track = {
			uid: crypto.randomUUID(),
			videoId: pick.videoId,
			source: 'youtube' as const,
			url: `https://www.youtube.com/watch?v=${pick.videoId}`,
			title: pick.title,
			channel: pick.channel,
			addedBy: room.name,
			addedById: room.clientId,
			votes: 0,
			voters: [] as string[],
			reactions: {}
		};
		if (!room.state.videoId) {
			room.playNow(track);
		} else {
			room.add(pick.videoId, pick.title, pick.channel, room.name, 'youtube', track.url);
		}
	}
	const filteredQueue = $derived(
		room.state.queue.filter((t) => {
			if (filterTag === 'all') return true;
			if (filterTag === 'focus') return t.tag === 'focus' || !t.tag;
			return t.tag === 'hangout';
		})
	);
</script>

<div class="panel mt-4">
	<form class="px-4 pt-4" onsubmit={submit}>
		<label for="yt-link" class="mb-1.5 block text-xs text-faint">Add a track link (Spotify, YouTube, SoundCloud)</label>
		<div class="flex gap-2">
			<input
				id="yt-link"
				type="text"
				inputmode="url"
				autocomplete="off"
				enterkeyhint="go"
				placeholder="Paste a link..."
				class="min-w-0 flex-1 rounded-field border border-cream/10 bg-night/60 px-3 py-2 text-sm text-cream outline-none transition-colors placeholder:text-faint/80 focus:border-lamp/60"
				bind:value={draft}
				aria-invalid={error ? true : undefined}
				aria-describedby={error ? 'yt-link-error' : undefined}
			/>
			<button class="btn btn-primary" type="submit" disabled={busy}>
				{#if busy}
					Checking…
				{:else}
					<IconPlus size={15} stroke={1.5} />
					Add
				{/if}
			</button>
		</div>

		<div class="mt-2.5 flex flex-wrap items-center gap-2">
			<input
				type="text"
				maxlength="80"
				autocomplete="off"
				placeholder="Optional dedication / shoutout..."
				class="min-w-0 flex-1 rounded-field border border-cream/10 bg-night/50 px-2.5 py-1 text-xs text-cream outline-none transition-colors placeholder:text-faint/60 focus:border-lamp/60"
				bind:value={dedicationDraft}
			/>
			<div class="flex rounded-full border border-cream/10 bg-night/50 p-0.5 text-[11px]">
				<button
					type="button"
					class="rounded-full px-2 py-0.5 transition-colors {tagDraft === 'focus' ? 'bg-lamp/20 text-lamp font-medium' : 'text-taupe hover:text-cream'}"
					onclick={() => (tagDraft = 'focus')}
				>
					Focus
				</button>
				<button
					type="button"
					class="rounded-full px-2 py-0.5 transition-colors {tagDraft === 'hangout' ? 'bg-amber-400/20 text-amber-300 font-medium' : 'text-taupe hover:text-cream'}"
					style={tagDraft === 'hangout' ? 'color: var(--color-amber); background: color-mix(in srgb, var(--color-amber) 20%, transparent)' : ''}
					onclick={() => (tagDraft = 'hangout')}
				>
					Hangout
				</button>
			</div>
		</div>

		{#if error}
			<p id="yt-link-error" class="mt-2 flex items-center gap-1.5 text-xs text-lamp">
				<IconAlert size={13} stroke={1.5} />
				{error}
			</p>
		{/if}
	</form>

	{#if room.state.queue.length > 0}
		<div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-cream/10 px-4 pt-3">
			<div class="flex items-center gap-2">
				<h3 class="text-sm font-medium">Up next</h3>
				<span class="num text-xs text-faint">{room.state.queue.length} in queue</span>
			</div>
			<!-- Queue filter tabs -->
			<div class="flex rounded-full border border-cream/10 bg-night/60 p-0.5 text-xs">
				<button
					type="button"
					class="rounded-full px-2.5 py-0.5 transition-colors {filterTag === 'all' ? 'bg-cream/10 text-cream font-medium' : 'text-faint hover:text-taupe'}"
					onclick={() => (filterTag = 'all')}
				>
					All
				</button>
				<button
					type="button"
					class="rounded-full px-2.5 py-0.5 transition-colors {filterTag === 'focus' ? 'bg-lamp/20 text-lamp font-medium' : 'text-faint hover:text-taupe'}"
					onclick={() => (filterTag = 'focus')}
				>
					Focus queue
				</button>
				<button
					type="button"
					class="rounded-full px-2.5 py-0.5 transition-colors {filterTag === 'hangout' ? 'bg-amber-400/20 text-amber-300 font-medium' : 'text-faint hover:text-taupe'}"
					style={filterTag === 'hangout' ? 'color: var(--color-amber); background: color-mix(in srgb, var(--color-amber) 20%, transparent)' : ''}
					onclick={() => (filterTag = 'hangout')}
				>
					Break queue
				</button>
			</div>
		</div>

		<ul class="divide-y divide-cream/8">
			{#each filteredQueue as track, i (track.uid)}
				<li class="flex items-center gap-3 px-4 py-2.5">
					<span class="num w-4 shrink-0 text-xs text-faint">{i + 1}</span>
					{#if track.source === 'youtube' && track.videoId}
						<img
							src={thumbnailFor(track.videoId)}
							alt=""
							width="56"
							height="32"
							loading="lazy"
							class="h-8 w-14 shrink-0 rounded object-cover"
						/>
					{:else}
						<div class="flex h-8 w-14 shrink-0 items-center justify-center rounded bg-night/60 text-faint">
							<IconDisc size={14} stroke={1.5} />
						</div>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<p class="truncate text-sm">{track.title}</p>
							{#if track.tag === 'hangout'}
								<span class="shrink-0 rounded-full px-1.5 py-0.2 text-[10px] font-mono uppercase" style="color: var(--color-amber); background: color-mix(in srgb, var(--color-amber) 15%, transparent)">
									Break
								</span>
							{:else}
								<span class="shrink-0 rounded-full bg-lamp/15 px-1.5 py-0.2 text-[10px] font-mono uppercase text-lamp">
									Focus
								</span>
							{/if}
						</div>
						<p class="truncate text-xs text-faint">
							{track.channel ?? track.source}
							<span class="text-faint/70">·</span>
							{track.addedBy}
							{#if (track.votes || 0) > 0}
								<span class="text-faint/70">·</span>
								{track.votes} upvotes
							{/if}
						</p>
						{#if track.dedication}
							<p class="mt-0.5 truncate text-[11px] italic text-faint/80">
								“{track.dedication}”
							</p>
						{/if}
					</div>
					<div class="flex items-center gap-0.5">
						<button
							class="icon-btn text-faint hover:text-cream"
							class:text-lamp={track.voters?.includes(room.clientId)}
							onclick={() => room.vote(track.uid)}
							title="Upvote"
							aria-label="Upvote {track.title}"
						>
							<IconThumbUp size={15} stroke={1.5} />
						</button>
						<button
							class="icon-btn text-faint hover:text-cream disabled:opacity-20"
							onclick={() => room.moveQueue(i, i - 1)}
							disabled={i === 0}
							title="Move up"
							aria-label="Move {track.title} up"
						>
							<IconChevronUp size={15} stroke={1.5} />
						</button>
						<button
							class="icon-btn text-faint hover:text-cream disabled:opacity-20"
							onclick={() => room.moveQueue(i, i + 1)}
							disabled={i === filteredQueue.length - 1}
							title="Move down"
							aria-label="Move {track.title} down"
						>
							<IconChevronDown size={15} stroke={1.5} />
						</button>
						<button
							class="icon-btn"
							onclick={() => room.playNow(track)}
							title="Play now"
							aria-label="Play {track.title} now"
						>
							<IconPlay size={15} stroke={1.5} />
						</button>
						<button
							class="icon-btn"
							onclick={() => room.remove(track.uid)}
							title="Remove"
							aria-label="Remove {track.title} from the queue"
						>
							<IconX size={15} stroke={1.5} />
						</button>
					</div>
				</li>
			{/each}
		</ul>

		<div class="border-t border-cream/10 px-4 py-3">
			<button
				class="flex w-full items-center justify-between py-1 text-xs text-taupe transition-colors hover:text-cream"
				onclick={() => (showCrate = !showCrate)}
				aria-expanded={showCrate}
			>
				<span class="flex items-center gap-2 font-medium">
					<IconDisc size={15} stroke={1.5} class="text-lamp" />
					24/7 Radios ({crate.length} picks)
				</span>
				<span class="num text-[11px] text-faint">
					{showCrate ? 'Hide crate' : 'Browse crate'}
				</span>
			</button>

			{#if showCrate}
				<div class="mt-3 grid gap-2.5 sm:grid-cols-2">
					{#each crate as pick, i (pick.videoId)}
						<button
							class="group flex items-center gap-3 rounded-field border border-cream/10 bg-night/50 p-2 text-left transition-colors hover:border-lamp/50 hover:bg-night {i ===
							crate.length - 1
								? 'sm:col-span-2'
								: ''}"
							onclick={() => startPick(pick)}
						>
							<img
								src={thumbnailFor(pick.videoId)}
								alt=""
								width="72"
								height="40"
								loading="lazy"
								class="h-10 w-[72px] shrink-0 rounded object-cover"
							/>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm">{pick.title}</span>
								<span class="block truncate text-xs text-faint">
									{pick.channel}
									<span class="text-faint/70">·</span>
									{pick.note}
								</span>
							</span>
							<IconPlay
								size={16}
								stroke={1.5}
								class="shrink-0 text-faint transition-colors group-hover:text-lamp"
							/>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<div class="mt-4 border-t border-cream/10 px-4 py-4">
			<div class="flex items-baseline justify-between gap-3">
				<h3 class="text-sm font-medium">Nothing queued</h3>
				<span class="num shrink-0 text-xs text-faint">from the crate</span>
			</div>
			<p class="mt-1 text-xs leading-relaxed text-faint">
				Hand-picked 24/7 radios for nights like this. One click puts one on for everyone.
			</p>
			<div class="mt-3 grid gap-2.5 sm:grid-cols-2">
				{#each crate as pick, i (pick.videoId)}
					<button
						class="group flex items-center gap-3 rounded-field border border-cream/10 bg-night/50 p-2 text-left transition-colors hover:border-lamp/50 hover:bg-night {i ===
						crate.length - 1
							? 'sm:col-span-2'
							: ''}"
						onclick={() => startPick(pick)}
					>
						<img
							src={thumbnailFor(pick.videoId)}
							alt=""
							width="72"
							height="40"
							loading="lazy"
							class="h-10 w-[72px] shrink-0 rounded object-cover"
						/>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm">{pick.title}</span>
							<span class="block truncate text-xs text-faint">
								{pick.channel}
								<span class="text-faint/70">·</span>
								{pick.note}
							</span>
						</span>
						<IconPlay
							size={16}
							stroke={1.5}
							class="shrink-0 text-faint transition-colors group-hover:text-lamp"
						/>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
