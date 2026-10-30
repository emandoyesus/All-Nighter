<script lang="ts">
	import { room } from '#lib/room/room.svelte';

	const listings = $derived([...room.directory]);
	const hasRoom = $derived(listings.length > 0);
	const topRoom = $derived(
		listings.reduce<import('#lib/room/types').RoomAd | null>(
			(top, cur) => (!top || cur.members > top.members ? cur : top),
			null
		)
	);
</script>

<!--
	Thin live-data strip: connects via the same MQTT directory the room lobby uses.
	Shows who's awake and what's on. Falls back gracefully when nothing is live.
-->
<div class="tonight-strip" aria-live="polite">
	{#if room.status === 'connecting'}
		<span class="soft-blink h-1.5 w-1.5 rounded-full bg-faint" aria-hidden="true"></span>
		<span>tuning in…</span>
	{:else if hasRoom && topRoom}
		<span class="soft-blink h-1.5 w-1.5 rounded-full bg-lamp tonight-strip__live" aria-hidden="true"></span>
		<span class="tonight-strip__live">{topRoom.members} awake</span>
		<span aria-hidden="true">·</span>
		<span class="truncate max-w-[24ch]">{topRoom.title || topRoom.room}</span>
		{#if listings.length > 1}
			<span aria-hidden="true">·</span>
			<a href="/room" class="today-strip__link text-taupe underline-offset-2 hover:text-lamp transition-colors hover:underline">
				+{listings.length - 1} more
			</a>
		{/if}
	{:else}
		<span class="h-1.5 w-1.5 rounded-full border border-faint" aria-hidden="true"></span>
		<span>quiet tonight</span>
		<span aria-hidden="true">—</span>
		<a href="/room" class="text-taupe underline-offset-2 hover:text-lamp transition-colors hover:underline">
			be the first to open the door
		</a>
	{/if}
</div>
