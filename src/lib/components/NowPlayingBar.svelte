<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import { thumbnailFor } from '#lib/room/youtube';
	import IconDisc from '@tabler/icons-svelte/icons/disc';
	import IconExternal from '@tabler/icons-svelte/icons/external-link';

	const EMOJIS = ['🔥', '🌙', '💜', '😂', '🥹', '🎧'];

	const track = $derived(room.state.current);
	const reactions = $derived(track?.reactions ?? {});

	function hasReacted(emoji: string): boolean {
		return (reactions[emoji] ?? []).includes(room.clientId);
	}

	function sourceLabel(source: string | undefined): string {
		if (source === 'spotify') return 'Spotify';
		if (source === 'soundcloud') return 'SoundCloud';
		if (source === 'youtube') return 'YouTube';
		return 'link';
	}
</script>

{#if track}
	<div class="panel flex flex-wrap items-center gap-3 border-lamp/25 px-4 py-3 md:flex-nowrap">
		{#if track.source === 'youtube' && track.videoId}
			<img
				src={thumbnailFor(track.videoId)}
				alt=""
				width="64"
				height="36"
				class="h-9 w-16 shrink-0 rounded object-cover"
			/>
		{:else}
			<span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lamp/12 text-lamp">
				<IconDisc size={17} stroke={1.5} />
			</span>
		{/if}

		<div class="min-w-0 flex-1">
			<p class="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-lamp">
				<span class="h-1.5 w-1.5 rounded-full bg-lamp {room.state.playing ? 'soft-blink' : ''}"></span>
				now playing
			</p>
			<p class="mt-0.5 truncate text-sm font-medium">{track.title}</p>
			<p class="truncate text-xs text-faint">
				{sourceLabel(track.source)}
				<span class="text-faint/70">·</span>
				added by
				<a href="/crew/{track.addedBy}" class="text-taupe transition-colors hover:text-lamp">{track.addedBy}</a>
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-1">
			{#each EMOJIS as emoji (emoji)}
				<button
					class="rounded-full border px-2 py-1 text-xs transition-colors {hasReacted(emoji)
						? 'border-lamp bg-lamp/15'
						: 'border-cream/10 bg-night/50 hover:border-cream/25'}"
					onclick={() => room.react(track.uid, emoji)}
					aria-pressed={hasReacted(emoji)}
					title="React {emoji}"
				>
					{emoji}
					{#if (reactions[emoji]?.length ?? 0) > 0}
						<span class="num ml-0.5 text-[10px] text-taupe">{reactions[emoji].length}</span>
					{/if}
				</button>
			{/each}

			{#if track.url && track.source !== 'youtube'}
				<a
					href={track.url}
					target="_blank"
					rel="noreferrer"
					class="icon-btn ml-1"
					title="Open on {sourceLabel(track.source)}"
					aria-label="Open {track.title} on {sourceLabel(track.source)}"
				>
					<IconExternal size={15} stroke={1.5} />
				</a>
			{/if}
		</div>
	</div>
{/if}
