<script lang="ts">
	import { room, sanitizeRoom, generateRoomKey } from '#lib/room/room.svelte';
	import { auth } from '#lib/auth.svelte';
	import IconPlus from '@tabler/icons-svelte/icons/plus';
	import IconDoorEnter from '@tabler/icons-svelte/icons/door-enter';
	import IconUsers from '@tabler/icons-svelte/icons/users';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconCopy from '@tabler/icons-svelte/icons/copy';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconWorld from '@tabler/icons-svelte/icons/world';
	import IconLock from '@tabler/icons-svelte/icons/lock';
	import IconShield from '@tabler/icons-svelte/icons/shield';
	import IconKey from '@tabler/icons-svelte/icons/key';
	import IconDice from '@tabler/icons-svelte/icons/dice';

	let creating = $state(false);
	let draft = $state('');
	let isPrivate = $state(false);
	let roomKeyDraft = $state(generateRoomKey());
	let adminOnly = $state(false);
	let nightPlan = $state('');
	let copiedSlug = $state<string | null>(null);
	let joinPrivateInput = $state('');
	let nameError = $state('');

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
		if (!auth.isCloudUser && !auth.user) {
			nameError = 'Sign in required to create and host a room.';
			window.dispatchEvent(new CustomEvent('an:open-auth-modal', { detail: { mode: 'signin' } }));
			return;
		}
		const name = draft.trim();
		const cleanSlug = sanitizeRoom(name);
		if (!name || !cleanSlug) {
			nameError = 'Please enter your room name';
			return;
		}
		nameError = '';
		if (nightPlan.trim()) {
			// Store the intention before creating the room so announce() picks it up
			room.setIntention(nightPlan.trim());
		}
		void room.createRoom(name, isPrivate, adminOnly, isPrivate ? roomKeyDraft : undefined);
	}

	function handleJoinPrivate(event: SubmitEvent): void {
		event.preventDefault();
		const target = joinPrivateInput.trim();
		if (!target) return;
		// Handle pasted full URLs like http://localhost:5173/room?room=my-room&key=123
		if (target.includes('room=')) {
			try {
				const u = new URL(target, window.location.origin);
				const p = u.searchParams.get('room');
				const k = u.searchParams.get('key');
				if (p) {
					if (k) {
						room.accessKey = k;
						try {
							localStorage.setItem('an.key.' + sanitizeRoom(p), k);
						} catch {}
					}
					room.joinRoom(p);
					return;
				}
			} catch {}
		}
		room.joinRoom(target);
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
							<div class="flex items-center gap-1.5 flex-wrap">
								<p class="truncate text-sm text-cream font-medium">{ad.title || ad.room}</p>
								{#if ad.isPrivate}
									<span class="inline-flex items-center gap-1 rounded bg-amber-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300 border border-amber-400/30">
										<IconLock size={10} stroke={2} />
										Private
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 rounded bg-lamp/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-lamp border border-lamp/30">
										<IconWorld size={10} stroke={2} />
										Public
									</span>
								{/if}
								{#if ad.adminOnlyPlayback}
									<span class="inline-flex items-center gap-1 rounded bg-teal-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-aqua-foam border border-teal-500/30" title="Aux restricted to admins">
										<IconShield size={10} stroke={2} />
										Aux: Admin
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 rounded bg-cream/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-taupe border border-cream/20" title="Aux open to everyone">
										Aux: No Admin
									</span>
								{/if}
							</div>
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
							{#if ad.isPrivate}
								<button
									class="btn btn-secondary btn-sm text-amber-300 hover:text-cream border-amber-400/30"
									onclick={() => room.requestJoin(ad.room, ad.title)}
								>
									<IconLock size={14} stroke={1.5} />
									Knock
								</button>
							{:else}
								<button
									class="btn btn-primary btn-sm"
									onclick={() => room.joinRoom(ad.room, ad.title)}
								>
									<IconDoorEnter size={14} stroke={1.5} />
									Join room
								</button>
							{/if}
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

		<!-- Join private room by slug / link -->
		<div class="mt-4 border-t border-cream/10 pt-4">
			<div class="flex items-center justify-between mb-1.5">
				<span class="text-xs text-faint flex items-center gap-1.5">
					<IconLock size={12} class="text-amber" />
					<span>Join private room</span>
				</span>
			</div>
			<form class="flex gap-2" onsubmit={handleJoinPrivate}>
				<input
					type="text"
					placeholder="Enter room name or paste link..."
					class="min-w-0 flex-1 rounded-field border border-cream/10 bg-night/60 px-3 py-1.5 text-xs text-cream outline-none focus:border-lamp/60"
					bind:value={joinPrivateInput}
				/>
				<button type="submit" class="btn btn-ghost btn-sm shrink-0">
					Join
				</button>
			</form>
		</div>
	</div>

	<!-- Open a room panel -->
	<div class="panel flex flex-col gap-4 p-5 md:p-7">
		<div>
			<div class="flex items-center gap-2.5">
				<span class="grid h-9 w-9 place-items-center rounded-full bg-lamp/15 text-lamp">
					<IconPlus size={18} stroke={1.5} />
				</span>
				<div>
					<h2 class="text-base font-medium">Create a room</h2>
					<p class="num text-xs text-faint">you become the host</p>
				</div>
			</div>
			<p class="mt-4 text-xs leading-relaxed text-faint">
				Pick a name and privacy. Share the link and let people knock — you decide who steps in.
			</p>
		</div>

		{#if !auth.isCloudUser}
			<div class="my-auto flex flex-col items-center gap-4 rounded-2xl border border-cream/15 bg-night/80 p-6 text-center">
				<div class="grid h-12 w-12 place-items-center rounded-full bg-lamp/15 text-lamp">
					<IconLock size={22} stroke={1.75} />
				</div>
				<div class="space-y-1.5">
					<h3 class="text-base font-medium text-cream">Sign in to host a room</h3>
					<p class="text-xs leading-relaxed text-taupe max-w-[34ch]">
						Guests can explore and join existing rooms, but creating and hosting a room requires an account.
					</p>
				</div>
				<div class="flex flex-col sm:flex-row gap-2.5 w-full pt-1">
					<button
						type="button"
						class="btn btn-primary flex-1 text-xs py-2.5 font-medium cursor-pointer"
						onclick={() => window.dispatchEvent(new CustomEvent('an:open-auth-modal', { detail: { mode: 'signin' } }))}
					>
						Sign In to Host
					</button>
					<button
						type="button"
						class="btn btn-ghost flex-1 text-xs py-2.5 font-medium border-cream/15 hover:border-lamp/40 cursor-pointer"
						onclick={() => window.dispatchEvent(new CustomEvent('an:open-auth-modal', { detail: { mode: 'signup' } }))}
					>
						Create Account
					</button>
				</div>
			</div>
		{:else}
			<form class="flex flex-col gap-3" onsubmit={create}>
				<!-- Room Privacy Mode -->
				<div>
					<span class="mb-1.5 block text-xs text-faint">Room Privacy</span>
					<div class="grid grid-cols-2 gap-2">
						<button
							type="button"
							class="flex flex-col items-start gap-1 rounded-field border px-3 py-2 text-left text-xs transition-colors {!isPrivate
								? 'border-lamp/50 bg-lamp/10 text-lamp'
								: 'border-cream/10 bg-night/50 text-taupe hover:border-cream/20 hover:text-cream'}"
							onclick={() => (isPrivate = false)}
						>
							<span class="flex items-center gap-1.5 font-medium">
								<IconWorld size={14} stroke={2} />
								Public Room
							</span>
							<span class="text-[11px] leading-snug opacity-75">Listed · Anyone can join</span>
						</button>

						<button
							type="button"
							class="flex flex-col items-start gap-1 rounded-field border px-3 py-2 text-left text-xs transition-colors {isPrivate
								? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
								: 'border-cream/10 bg-night/50 text-taupe hover:border-cream/20 hover:text-cream'}"
							onclick={() => (isPrivate = true)}
						>
							<span class="flex items-center gap-1.5 font-medium">
								<IconLock size={14} stroke={2} />
								Private Room
							</span>
							<span class="text-[11px] leading-snug opacity-75">Knock required · Direct with invite</span>
						</button>
					</div>
				</div>

				<!-- Aux Permissions Mode -->
				<div>
					<span class="mb-1.5 block text-xs text-faint">Aux Permissions</span>
					<div class="grid grid-cols-2 gap-2">
						<button
							type="button"
							class="flex flex-col items-start gap-1 rounded-field border px-3 py-2 text-left text-xs transition-colors {!adminOnly
								? 'border-lamp/50 bg-lamp/10 text-lamp'
								: 'border-cream/10 bg-night/50 text-taupe hover:border-cream/20 hover:text-cream'}"
							onclick={() => (adminOnly = false)}
						>
							<span class="flex items-center gap-1.5 font-medium">
								Aux: No Admin
							</span>
							<span class="text-[11px] leading-snug opacity-75">Anyone can play, pause, seek, skip</span>
						</button>

						<button
							type="button"
							class="flex flex-col items-start gap-1 rounded-field border px-3 py-2 text-left text-xs transition-colors {adminOnly
								? 'border-teal-500/50 bg-teal-500/15 text-aqua-foam'
								: 'border-cream/10 bg-night/50 text-taupe hover:border-cream/20 hover:text-cream'}"
							onclick={() => (adminOnly = true)}
						>
							<span class="flex items-center gap-1.5 font-medium">
								<IconShield size={14} stroke={2} />
								Aux: Admin
							</span>
							<span class="text-[11px] leading-snug opacity-75">Only host & admins control playback</span>
						</button>
					</div>
				</div>

				<div>
					<label for="room-name" class="text-xs text-faint flex items-center justify-between mb-1.5">
						<span>Room name <span class="text-amber">*</span></span>
						{#if slug}
							<span class="font-mono text-[10px] text-taupe">slug: ?room={slug}</span>
						{/if}
					</label>
					<input
						id="room-name"
						type="text"
						maxlength="24"
						required
						autocomplete="off"
						placeholder="Enter your room name (e.g. entoto-haven)..."
						class="w-full rounded-field border bg-night/60 px-3 py-2 text-sm text-cream outline-none transition-colors focus:border-lamp/60 {nameError ? 'border-ruby/70 focus:border-ruby' : 'border-cream/10'}"
						bind:value={draft}
						oninput={() => { if (nameError) nameError = ''; }}
					/>
					{#if nameError}
						<p class="mt-1 text-[11px] font-mono text-ruby">{nameError}</p>
					{/if}
				</div>

				{#if isPrivate}
					<div class="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3">
						<div class="flex items-center justify-between mb-1">
							<label for="private-key" class="text-xs font-mono text-amber-300 flex items-center gap-1.5">
								<IconKey size={13} stroke={2} />
								<span>Secret Invite Key</span>
							</label>
							<button
								type="button"
								class="text-[10px] font-mono text-faint hover:text-cream flex items-center gap-1 transition-colors cursor-pointer"
								onclick={() => (roomKeyDraft = generateRoomKey())}
								title="Generate new secure key"
							>
								<IconDice size={12} stroke={1.5} />
								<span>Randomize</span>
							</button>
						</div>
						<input
							id="private-key"
							type="text"
							maxlength="32"
							bind:value={roomKeyDraft}
							placeholder="e.g. m4K7pW9xN2bQ"
							class="w-full rounded-lg border border-amber-400/30 bg-night/80 px-2.5 py-1.5 text-xs text-amber-200 font-mono outline-none focus:border-amber-400"
						/>
						<p class="mt-1 text-[10px] text-faint font-mono">
							Direct link: <span class="text-taupe">{slug ? `?room=${slug}&key=${roomKeyDraft}` : 'enter room name first'}</span>
						</p>
					</div>
				{:else}
					<p class="num text-[11px] text-faint">
						{#if slug}
							link → ?room={slug}
						{:else}
							link → enter your room name above
						{/if}
					</p>
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

				<button
					type="submit"
					class="btn btn-amber w-full font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
					disabled={!slug}
				>
					<IconPlus size={16} stroke={1.5} />
					{isPrivate ? 'Create Private Room' : 'Create a room'}
				</button>
			</form>
		{/if}

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
