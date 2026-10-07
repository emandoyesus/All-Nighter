<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import { crate } from '#lib/data/crate';
	import { parseYouTubeId, fetchVideoMeta, thumbnailFor } from '#lib/room/youtube';
	import IconPlus from '@tabler/icons-svelte/icons/plus';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconPlay from '@tabler/icons-svelte/icons/player-play';
	import IconAlert from '@tabler/icons-svelte/icons/alert-triangle';

	let draft = $state('');
	let busy = $state(false);
	let error = $state('');

	async function submit(e: Event): Promise<void> {
		e.preventDefault();
		error = '';
		const id = parseYouTubeId(draft);
		if (!id) {
			error = 'That does not look like a YouTube link.';
			return;
		}
		busy = true;
		const meta = await fetchVideoMeta(id);
		busy = false;
		if (!meta) {
			error = 'Could not read that video. Check the link and try again.';
			return;
		}
		room.add(id, meta.title, meta.channel, room.name);
		draft = '';
	}

	function startPick(pick: (typeof crate)[number]): void {
		const track = {
			uid: crypto.randomUUID(),
			videoId: pick.videoId,
			title: pick.title,
			channel: pick.channel,
			addedBy: room.name
		};
		if (!room.state.videoId) {
			room.playNow(track);
		} else {
			room.add(pick.videoId, pick.title, pick.channel, room.name);
		}
	}
</script>

<div class="panel mt-4">
	<form class="px-4 pt-4" onsubmit={submit}>
		<label for="yt-link" class="mb-1.5 block text-xs text-faint">Add a YouTube link</label>
		<div class="flex gap-2">
			<input
				id="yt-link"
				type="text"
				inputmode="url"
				autocomplete="off"
				enterkeyhint="go"
				placeholder="youtube.com/watch?v=..."
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
		{#if error}
			<p id="yt-link-error" class="mt-2 flex items-center gap-1.5 text-xs text-lamp">
				<IconAlert size={13} stroke={1.5} />
				{error}
			</p>
		{/if}
	</form>

	{#if room.state.queue.length > 0}
		<div class="mt-4 flex items-baseline justify-between border-t border-cream/10 px-4 pt-3">
			<h3 class="text-sm font-medium">Up next</h3>
			<span class="num text-xs text-faint">{room.state.queue.length} in queue</span>
		</div>
		<ul class="divide-y divide-cream/8">
			{#each room.state.queue as track, i (track.uid)}
				<li class="flex items-center gap-3 px-4 py-2.5">
					<span class="num w-4 shrink-0 text-xs text-faint">{i + 1}</span>
					<img
						src={thumbnailFor(track.videoId)}
						alt=""
						width="56"
						height="32"
						loading="lazy"
						class="h-8 w-14 shrink-0 rounded object-cover"
					/>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm">{track.title}</p>
						<p class="truncate text-xs text-faint">
							{track.channel ?? 'YouTube'}
							<span class="text-faint/70">·</span>
							{track.addedBy}
						</p>
					</div>
					<button
						class="icon-btn"
						onclick={() => room.playNow(track)}
						aria-label="Play {track.title} now"
					>
						<IconPlay size={15} stroke={1.5} />
					</button>
					<button
						class="icon-btn"
						onclick={() => room.remove(track.uid)}
						aria-label="Remove {track.title} from the queue"
					>
						<IconX size={15} stroke={1.5} />
					</button>
				</li>
			{/each}
		</ul>
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
