<script lang="ts">
	import { room, sanitizeRoom } from '#lib/room/room.svelte';
	import IconPlus from '@tabler/icons-svelte/icons/plus';
	import IconDoorEnter from '@tabler/icons-svelte/icons/door-enter';
	import IconUsers from '@tabler/icons-svelte/icons/users';
	import IconMoon from '@tabler/icons-svelte/icons/moon';

	let creating = $state(false);
	let draft = $state('');

	const listings = $derived(
		[...room.directory].sort((a, b) => b.members - a.members || b.ts - a.ts)
	);

	const slug = $derived(sanitizeRoom(draft));

	function create(event: SubmitEvent): void {
		event.preventDefault();
		if (!draft.trim()) return;
		room.createRoom(draft);
	}
</script>

<div class="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
	<div class="panel flex flex-col p-5 md:p-7">
		<div class="flex items-center justify-between gap-3">
			<div class="flex items-center gap-2.5">
				<span class="grid h-9 w-9 place-items-center rounded-full bg-lamp/15 text-lamp">
					<IconUsers size={18} stroke={1.5} />
				</span>
				<div>
					<h2 class="text-base font-medium">Rooms tonight</h2>
					<p class="num text-xs text-faint">
						{listings.length === 0 ? 'nobody has opened one yet' : `${listings.length} open`}
					</p>
				</div>
			</div>
			{#if room.status === 'online'}
				<span class="inline-flex items-center gap-2 rounded-full border border-cream/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-taupe">
					<span class="h-1.5 w-1.5 rounded-full bg-lamp"></span>
					live
				</span>
			{:else}
				<span class="inline-flex items-center gap-2 rounded-full border border-cream/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
					<span class="soft-blink h-1.5 w-1.5 rounded-full bg-lamp"></span>
					listening
				</span>
			{/if}
		</div>

		{#if listings.length > 0}
			<ul class="mt-5 space-y-2">
				{#each listings as ad (ad.room)}
					<li
						class="flex items-center justify-between gap-4 rounded-field border border-cream/10 bg-night/50 px-4 py-3 transition-colors hover:border-cream/20"
					>
						<div class="min-w-0">
							<p class="truncate text-sm text-cream">{ad.title || ad.room}</p>
							<p class="num mt-0.5 truncate text-xs text-faint">
								room / {ad.room} · host {ad.host || 'unknown'} · {ad.members} awake
							</p>
						</div>
						<button
							class="btn btn-ghost btn-sm shrink-0"
							onclick={() => room.requestJoin(ad.room)}
						>
							<IconDoorEnter size={14} stroke={1.5} />
							Ask to join
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<div class="mt-6 flex flex-1 flex-col items-center justify-center rounded-field border border-dashed border-cream/15 px-6 py-12 text-center">
				<span class="grid h-11 w-11 place-items-center rounded-full bg-night/70 text-faint">
					<IconMoon size={20} stroke={1.5} />
				</span>
				<p class="mt-4 text-sm text-cream">No rooms today</p>
				<p class="mt-1.5 max-w-[34ch] text-xs leading-relaxed text-faint">
					Nobody has the light on yet. Open one and the night starts with you.
				</p>
			</div>
		{/if}
	</div>

	<div class="panel flex flex-col gap-4 p-5 md:p-7">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="grid h-9 w-9 place-items-center rounded-full bg-lamp/15 text-lamp">
					<IconPlus size={18} stroke={1.5} />
				</span>
				<div>
					<h2 class="text-base font-medium">Open a room</h2>
					<p class="num text-xs text-faint">you become the host</p>
				</div>
			</div>
			<p class="mt-4 text-xs leading-relaxed text-faint">
				Pick a name. Share the link and let people ask to come in — you decide who gets the door.
			</p>
		</div>

		<form class="flex flex-col gap-3" onsubmit={create}>
			<label for="room-name" class="text-xs text-faint">Room name</label>
			<input
				id="room-name"
				type="text"
				maxlength="24"
				autocomplete="off"
				placeholder="late-night-shift"
				class="w-full rounded-field border border-cream/10 bg-night/60 px-3 py-2 text-sm text-cream outline-none transition-colors focus:border-lamp/60"
				bind:value={draft}
			/>
			{#if draft.trim()}
				<p class="num text-[11px] text-faint">link → ?room={slug}</p>
			{/if}
			<button type="submit" class="btn btn-lamp w-full" disabled={!draft.trim()}>
				<IconDoorEnter size={16} stroke={1.5} />
				Open the room
			</button>
		</form>

		<div class="mt-auto border-t border-cream/10 pt-4">
			<label for="lobby-callsign" class="mb-1.5 block text-xs text-faint">Your callsign</label>
			<input
				id="lobby-callsign"
				type="text"
				maxlength="24"
				autocomplete="off"
				class="w-full rounded-field border border-cream/10 bg-night/60 px-3 py-2 text-sm text-cream outline-none transition-colors focus:border-lamp/60"
				value={room.name}
				oninput={(e) => room.setName(e.currentTarget.value)}
			/>
		</div>
	</div>
</div>
