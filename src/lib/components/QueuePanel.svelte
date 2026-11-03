<script lang="ts">
	import { room, parseTrackUrl } from '#lib/room/room.svelte';
	import { parseYouTubeId, fetchVideoMeta, fetchPlaylistMeta, thumbnailFor, fetchSpotifyMeta, searchYouTubeVideo } from '#lib/room/youtube';
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

	async function submit(e: Event): Promise<void> {
		e.preventDefault();
		error = '';
		const parsed = parseTrackUrl(draft);
		const ded = dedicationDraft.trim() || undefined;
		const tag = tagDraft;

		// YouTube Playlist
		if (parsed.source === 'youtube' && (parsed.isPlaylist || parsed.playlistId)) {
			busy = true;
			const plistId = parsed.playlistId ?? '';
			const meta = plistId ? await fetchPlaylistMeta(plistId) : null;
			busy = false;
			const title = meta?.title ?? `YouTube Playlist (${plistId || parsed.id})`;
			const channel = meta?.channel ?? 'YouTube';
			const videoId = meta?.firstVideoId || parsed.id || null;
			room.add(videoId, title, channel, room.name, 'youtube', draft.trim(), ded, tag, true, plistId);
			draft = '';
			dedicationDraft = '';
			return;
		}

		// YouTube Single Video
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

		// Spotify Track or Playlist
		if (parsed.source === 'spotify' || draft.includes('spotify.com')) {
			busy = true;
			try {
				const isList = parsed.isPlaylist || draft.includes('/playlist/') || draft.includes('/album/');
				const spotMeta = await fetchSpotifyMeta(draft.trim());
				if (spotMeta?.title) {
					busy = false;
					room.add(
						null,
						spotMeta.title,
						isList ? 'Spotify Playlist' : 'Spotify',
						room.name,
						'spotify',
						draft.trim(),
						ded,
						tag,
						isList,
						parsed.playlistId || parsed.id || undefined
					);
					draft = '';
					dedicationDraft = '';
					return;
				}
			} catch {}
			busy = false;
			error = 'Could not resolve that Spotify link. Check the URL and try again.';
			return;
		}

		// SoundCloud Track or Playlist
		if (parsed.source === 'soundcloud') {
			const isList = parsed.isPlaylist || draft.includes('/sets/');
			const title = isList ? `SoundCloud Playlist (${parsed.id})` : `SoundCloud (${parsed.id})`;
			const channel = 'SoundCloud';
			room.add(null, title, channel, room.name, 'soundcloud', draft.trim(), ded, tag, isList, parsed.playlistId || undefined);
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

		error = 'Paste a YouTube, Spotify, or SoundCloud track or playlist link.';
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
		<label for="yt-link" class="mb-1.5 block text-xs text-faint">Add a track or playlist link (YouTube, Spotify, SoundCloud)</label>
		<div class="flex gap-2">
			<input
				id="yt-link"
				type="text"
				inputmode="url"
				autocomplete="off"
				enterkeyhint="go"
				placeholder="Paste a track or playlist link..."
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
							{#if track.isPlaylist}
								<span class="shrink-0 rounded bg-cyan/15 px-1.5 py-0.2 text-[9px] font-mono uppercase text-cyan font-semibold tracking-wider">
									Playlist
								</span>
							{/if}
							{#if track.tag === 'hangout'}
								<span class="shrink-0 rounded-full px-1.5 py-0.2 text-[10px] font-mono uppercase text-lamp bg-lamp/15">
									Normal
								</span>
							{:else}
								<span class="shrink-0 rounded-full bg-amber-400/15 px-1.5 py-0.2 text-[10px] font-mono uppercase text-amber-300">
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
	{:else}
		<div class="mt-4 border-t border-cream/10 px-4 py-8 text-center">
			<h3 class="text-sm font-medium text-cream">Queue is empty</h3>
			<p class="mt-1 text-xs text-taupe">
				Paste any YouTube, Spotify, or SoundCloud link above to queue tracks. Tracks play in order.
			</p>
		</div>
	{/if}
</div>
