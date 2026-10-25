<script lang="ts">
	import { asset } from '$app/paths';
	import type { Night } from '#lib/data/archive';
	import IconBrandYoutube from '@tabler/icons-svelte/icons/brand-youtube';
	import IconBrandSpotify from '@tabler/icons-svelte/icons/brand-spotify';
	import IconCopy from '@tabler/icons-svelte/icons/copy';
	import IconCheck from '@tabler/icons-svelte/icons/check';

	let { night }: { night: Night } = $props();
	let copied = $state(false);

	const youtubeIds = $derived(
		night.tracklist.map((track) => track.videoId).filter((id): id is string => !!id)
	);

	const youtubeUrl = $derived(
		youtubeIds.length > 0
			? `https://www.youtube.com/watch_videos?video_ids=${youtubeIds.join(',')}`
			: `https://www.youtube.com/results?search_query=${encodeURIComponent(night.title)}`
	);

	function plainList(): string {
		return night.tracklist.map((track) => `${track.artist} - ${track.title}`).join('\n');
	}

	async function copyList(): Promise<void> {
		try {
			await navigator.clipboard.writeText(plainList());
			copied = true;
			window.setTimeout(() => (copied = false), 1800);
		} catch {
			/* clipboard blocked */
		}
	}

	async function exportSpotify(): Promise<void> {
		await copyList();
		window.open(
			`https://open.spotify.com/search/${encodeURIComponent(night.title)}`,
			'_blank',
			'noopener'
		);
	}
</script>

<div class="panel p-5">
	<h3 class="text-sm font-medium">Take the night with you</h3>
	<p class="mt-1.5 text-xs leading-relaxed text-taupe">
		Rebuild this set as a playlist, or keep the list for the next lock-in.
	</p>
	<div class="mt-3.5 flex flex-wrap gap-2">
		<a href={youtubeUrl} target="_blank" rel="noreferrer" class="btn btn-primary btn-sm">
			<IconBrandYoutube size={15} stroke={1.5} />
			YouTube playlist
		</a>
		<button class="btn btn-ghost btn-sm" onclick={exportSpotify}>
			<IconBrandSpotify size={15} stroke={1.5} />
			Export for Spotify
		</button>
		<button class="btn btn-ghost btn-sm" onclick={copyList}>
			{#if copied}
				<IconCheck size={15} stroke={1.5} />
				Copied
			{:else}
				<IconCopy size={15} stroke={1.5} />
				Copy tracklist
			{/if}
		</button>
	</div>
	<p class="num mt-3 text-[11px] text-faint">
		{youtubeIds.length > 0
			? `${youtubeIds.length} of ${night.tracklist.length} tracks have a direct video link.`
			: 'Add video ids in archive.ts to build a one-click playlist.'}
	</p>
</div>
