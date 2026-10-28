<script lang="ts">
	import { room, sanitizeRoom } from '#lib/room/room.svelte';
	import IconPlus from '@tabler/icons-svelte/icons/plus';
	import IconDoorEnter from '@tabler/icons-svelte/icons/door-enter';
	import IconUsers from '@tabler/icons-svelte/icons/users';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconCopy from '@tabler/icons-svelte/icons/copy';
	import IconCheck from '@tabler/icons-svelte/icons/check';

	let creating = $state(false);
	let draft = $state('');
	let nightPlan = $state('');
	let copiedSlug = $state<string | null>(null);

	async function copyInvite(slug: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(room.inviteUrl(slug));
			copiedSlug = slug;
			window.setTimeout(() => {
				if (copiedSlug === slug) copiedSlug = null;
			}, 1800);
		} catch {
			/* clipboard blocked */
		}
	}

	const listings = $derived(
		[...room.directory].sort((a, b) => b.members - a.members || b.ts - a.ts)
	);

	const slug = $derived(sanitizeRoom(draft));

	function create(event: SubmitEvent): void {
		event.preventDefault();
		if (!draft.trim()) return;
		if (nightPlan.trim()) {
			// Store the intention before creating the room so announce() picks it up
			room.setIntention(nightPlan.trim());
		}
		room.createRoom(draft);
	}
</script>

<div class="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
	<!-- Rooms tonight panel -->
	<div class="panel flex flex-col p-5 md:p-7">
		<div class="flex items-center justify-between gap-3">
			<div class="flex items-center gap-2.5">
				<span class="grid h-9 w-9 place-items-center rounded-full bg-lamp/15 text-lamp">
					<IconUsers size={18} stroke={1.5} />
				</span>
				<div>
					<h2 class="text-base font-medium">Rooms tonight</h2>
					<p class="num text-xs text-faint">
						{listings.length === 0 ? "nobody's lit up yet" : `${listings.length} open`}
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
								{ad.members} awake · host {ad.host || 'unknown'}
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-1.5">
							<button
								class="icon-btn text-faint hover:text-cream"
								onclick={() => copyInvite(ad.room)}
								title={copiedSlug === ad.room ? 'Link copied!' : 'Copy room link'}
								aria-label="Copy link for {ad.title || ad.room}"
							>
								{#if copiedSlug === ad.room}
									<IconCheck size={14} stroke={2} class="text-lamp" />
								{:else}
									<IconCopy size={14} stroke={1.5} />
								{/if}
							</button>
							<button
								class="btn btn-primary btn-sm"
								onclick={() => room.joinRoom(ad.room, ad.title)}
							>
								<IconDoorEnter size={14} stroke={1.5} />
								Step in
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<div class="mt-6 flex flex-1 flex-col items-center justify-center rounded-field border border-dashed border-cream/15 px-6 py-12 text-center">
				<span class="grid h-11 w-11 place-items-center rounded-full bg-night/70 text-faint">
					<IconMoon size={20} stroke={1.5} />
				</span>
				<p class="mt-4 text-sm text-cream">Nobody's lit up yet.</p>
				<p class="mt-1.5 max-w-[34ch] text-xs leading-relaxed text-faint">
					Open a room and the night starts with you.
				</p>
			</div>
		{/if}
	</div>

	<!-- Open a room panel -->
	<div class="panel flex flex-col gap-4 p-5 md:p-7">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="grid h-9 w-9 place-items-center rounded-full bg-lamp/15 text-lamp">
					<IconPlus size={18} stroke={1.5} />
				</span>
				<div>
					<h2 class="text-base font-medium">Open the door</h2>
					<p class="num text-xs text-faint">you become the host</p>
				</div>
			</div>
			<p class="mt-4 text-xs leading-relaxed text-faint">
				Pick a name. Share the link and let people knock — you decide who steps in.
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

			<label for="night-plan" class="text-xs text-faint">What's the plan tonight?</label>
			<input
				id="night-plan"
				type="text"
				maxlength="80"
				autocomplete="off"
				placeholder="one line is enough"
				class="w-full rounded-field border border-cream/10 bg-night/60 px-3 py-2 text-sm text-cream outline-none transition-colors placeholder:text-faint/60 focus:border-lamp/60"
				bind:value={nightPlan}
			/>

			<button type="submit" class="btn btn-primary w-full" disabled={!draft.trim()}>
				<IconDoorEnter size={16} stroke={1.5} />
				Open the door
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
