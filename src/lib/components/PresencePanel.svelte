<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import IconCrown from '@tabler/icons-svelte/icons/crown';
	import IconShield from '@tabler/icons-svelte/icons/shield';
	import IconShieldCheck from '@tabler/icons-svelte/icons/shield-check';
	import IconChevronDown from '@tabler/icons-svelte/icons/chevron-down';
	import IconChevronUp from '@tabler/icons-svelte/icons/chevron-up';
	import IconUserPlus from '@tabler/icons-svelte/icons/user-plus';

	let showEdit = $state(false);

	function initial(name: string): string {
		return name.trim().charAt(0).toUpperCase() || '?';
	}

	function peerClock(tz: string | undefined): { time: string; badge: string; icon: string } | null {
		if (!tz) return null;
		try {
			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: tz,
				hour: 'numeric',
				minute: '2-digit',
				hour12: false
			});
			const parts = formatter.formatToParts(new Date(room.now));
			const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
			const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
			const time = `${String(hour).padStart(2, '0')}:${minute}`;

			if (hour >= 23 || hour < 5) {
				return { time, badge: 'deep night', icon: '🌙' };
			}
			if (hour >= 5 && hour < 7) {
				return { time, badge: 'dawn', icon: '🌅' };
			}
			if (hour >= 19 && hour < 23) {
				return { time, badge: 'night', icon: '🌙' };
			}
			return { time, badge: 'daylight', icon: '☀️' };
		} catch {
			return null;
		}
	}

	function peerColor(name: string): { bg: string; text: string; border: string } {
		const palettes = [
			{ bg: 'bg-amber-400/15', text: 'text-amber-300', border: 'border-amber-400/40' },
			{ bg: 'bg-teal-400/15', text: 'text-aqua-foam', border: 'border-teal-400/40' },
			{ bg: 'bg-rose-400/15', text: 'text-rose-300', border: 'border-rose-400/40' },
			{ bg: 'bg-violet-400/15', text: 'text-violet-300', border: 'border-violet-400/40' },
			{ bg: 'bg-sky-400/15', text: 'text-sky-300', border: 'border-sky-400/40' },
			{ bg: 'bg-emerald-400/15', text: 'text-emerald-300', border: 'border-emerald-400/40' },
			{ bg: 'bg-orange-400/15', text: 'text-orange-300', border: 'border-orange-400/40' },
			{ bg: 'bg-fuchsia-400/15', text: 'text-fuchsia-300', border: 'border-fuchsia-400/40' }
		];
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = (hash << 5) - hash + name.charCodeAt(i);
			hash |= 0;
		}
		return palettes[Math.abs(hash) % palettes.length];
	}
</script>

<div class="panel p-3.5 sm:p-4 overflow-hidden">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<h3 class="text-xs sm:text-sm font-medium">Awake now</h3>
			<button
				type="button"
				class="inline-flex items-center gap-1 rounded-full border border-lamp/30 bg-lamp/10 px-2 py-0.5 text-[10px] font-mono text-lamp hover:bg-lamp/20 hover:border-lamp/50 transition-colors cursor-pointer"
				onclick={() => window.dispatchEvent(new CustomEvent('an:open-share-modal'))}
				title="Share room and invite friends"
			>
				<IconUserPlus size={11} stroke={2} />
				<span>Invite</span>
			</button>
		</div>
		<span class="inline-flex items-center gap-1.5 rounded-full border border-lamp/40 bg-lamp/10 px-2 py-0.5 font-mono text-[10px] text-lamp font-medium">
			<span class="h-1.5 w-1.5 rounded-full bg-lamp animate-pulse"></span>
			{room.awake.length} awake
		</span>
	</div>

	<!-- Roster with intentions & local time -->
	<ul class="mt-2.5 max-h-[160px] overflow-y-auto overflow-x-hidden space-y-1.5 pr-1 custom-scrollbar">
		{#each room.awake as peer (peer.id)}
			{@const pClock = peerClock(peer.tz)}
			{@const isPeerHost = peer.name === room.hostName() || (peer.self && room.isHost)}
			{@const isPeerAdmin = room.isAdmin(peer.id, peer.name)}
			<li class="flex items-center gap-2 group text-xs">
				<button
					type="button"
					class="flex items-center gap-2 min-w-0 flex-1 text-left rounded-lg p-1 transition-colors hover:bg-cream/5 cursor-pointer"
					onclick={() => window.dispatchEvent(new CustomEvent('an:inspect-peer', { detail: { peer } }))}
					title="View {peer.name}'s nocturnal profile"
				>
					{#if peer.avatar}
						<img
							src={peer.avatar}
							alt={peer.name}
							class="h-5 w-5 shrink-0 rounded-full object-cover border border-cream/20 bg-night group-hover:scale-105 transition-transform"
						/>
					{:else}
						{@const pColor = peerColor(peer.name)}
						<span
							class="grid h-5 w-5 shrink-0 place-items-center rounded-full {pColor.bg} {pColor.text} {pColor.border} border text-[10px] font-semibold group-hover:scale-105 transition-transform"
						>
							{initial(peer.name)}
						</span>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-1">
							<span class="truncate {peer.self ? 'text-cream font-medium' : 'text-taupe group-hover:text-cream'}">{peer.name}</span>
							{#if isPeerHost}
								<span class="inline-flex items-center gap-0.5 rounded bg-amber-400/15 px-1 py-0.1 text-[9px] text-amber-300 font-mono border border-amber-400/30" title="Room Host">
									<IconCrown size={9} stroke={2} />
									Host
								</span>
							{:else if isPeerAdmin}
								<span class="inline-flex items-center gap-0.5 rounded bg-teal-500/15 px-1 py-0.1 text-[9px] text-aqua-foam font-mono border border-teal-500/30" title="Room Admin (Aux control)">
									<IconShieldCheck size={9} stroke={2} />
									Admin
								</span>
							{/if}
							{#if peer.status}
								<span class="rounded-full bg-cream/8 px-1 py-0.1 text-[10px] text-lamp">{peer.status}</span>
							{/if}
							{#if room.mode === 'focus'}
								<span class="inline-flex items-center gap-0.5 rounded bg-amber-400/15 px-1 py-0.1 text-[9px] text-amber-300 font-mono border border-amber-400/30" title="Active Focus Sprint">
									⚡ Locked in
								</span>
							{/if}
							{#if pClock}
								<span
									class="num inline-flex items-center gap-0.5 rounded bg-night/80 px-1 py-0.1 text-[9px] text-faint ring-1 ring-cream/10"
									title={`${pClock.badge} for ${peer.name}`}
								>
									<span>{pClock.icon}</span>
									<span>{pClock.time}</span>
								</span>
							{/if}
						</div>
						{#if peer.intention}
							<p class="truncate text-[10px] italic text-faint/80">{peer.intention}</p>
						{/if}
					</div>
				</button>

				<!-- Host control to toggle Admin status and transfer ownership -->
				{#if room.isHost && !isPeerHost && !peer.self}
					<div class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
						<button
							type="button"
							class="p-1 rounded transition-colors {isPeerAdmin
								? 'text-aqua-foam hover:bg-teal-500/20'
								: 'text-faint hover:text-cream hover:bg-white/5'}"
							onclick={() => room.toggleAdmin(peer.id, peer.name)}
							title={isPeerAdmin ? `Revoke admin privileges from ${peer.name}` : `Promote ${peer.name} to Admin (aux control)`}
							aria-label={isPeerAdmin ? `Revoke admin from ${peer.name}` : `Make ${peer.name} admin`}
						>
							{#if isPeerAdmin}
								<IconShieldCheck size={14} stroke={2} />
							{:else}
								<IconShield size={14} stroke={1.5} />
							{/if}
						</button>

						<button
							type="button"
							class="p-1 rounded transition-colors text-faint hover:text-amber hover:bg-amber/15 cursor-pointer"
							onclick={() => {
								window.dispatchEvent(
									new CustomEvent('an:open-transfer-host', {
										detail: { id: peer.id, name: peer.name, avatar: peer.avatar }
									})
								);
							}}
							title="Transfer host ownership to {peer.name}"
							aria-label="Transfer host ownership to {peer.name}"
						>
							<IconCrown size={14} stroke={1.8} />
						</button>
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	{#if room.awake.length === 1}
		<div class="mt-2.5 rounded-xl border border-dashed border-cream/15 bg-cream/3 p-3 text-center">
			<p class="text-xs text-cream/90 font-medium">You're the only one here right now</p>
			<p class="text-[11px] text-taupe mt-0.5">Share your room link so your crew can join you.</p>
			<button
				type="button"
				class="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-lamp/15 border border-lamp/35 px-3 py-1 text-xs font-mono text-lamp hover:bg-lamp/25 transition-colors cursor-pointer shadow-sm"
				onclick={() => window.dispatchEvent(new CustomEvent('an:open-share-modal'))}
			>
				<IconUserPlus size={13} stroke={1.8} />
				<span>Invite friends</span>
			</button>
		</div>
	{/if}

	<!-- Who was here earlier (joined and left without ending the whole night) -->
	{#if room.leftPeers.length > 0}
		<div class="mt-2.5 pt-2 border-t border-cream/8">
			<p class="text-[10px] font-mono uppercase tracking-wider text-faint mb-1.5 flex items-center justify-between">
				<span>Who was here earlier</span>
				<span class="num text-[9px] text-faint">{room.leftPeers.length} left</span>
			</p>
			<div class="flex flex-wrap gap-1">
				{#each room.leftPeers as peer (peer.name)}
					<button
						type="button"
						class="inline-flex items-center gap-1.5 rounded-full bg-night/50 border border-cream/10 px-2 py-0.5 text-[10px] text-taupe hover:text-cream hover:border-cream/25 transition-colors cursor-pointer"
						onclick={() => window.dispatchEvent(new CustomEvent('an:inspect-peer', { detail: { peer } }))}
						title="{peer.name} was here earlier tonight"
					>
						{#if peer.avatar}
							<img src={peer.avatar} alt={peer.name} class="h-3.5 w-3.5 rounded-full object-cover grayscale opacity-70" />
						{:else}
							<span class="h-1.5 w-1.5 rounded-full bg-cream/30"></span>
						{/if}
						<span class="truncate max-w-[90px]">{peer.name}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Collapsible Quick Profile & Mood -->
	<div class="mt-2.5 border-t border-cream/8 pt-2">
		<button
			type="button"
			class="flex w-full items-center justify-between text-[11px] text-faint hover:text-cream transition-colors"
			onclick={() => (showEdit = !showEdit)}
		>
			<span class="font-mono">Your intention & mood</span>
			<span class="inline-flex items-center gap-0.5 text-lamp">
				{showEdit ? 'hide' : 'edit'}
				{#if showEdit}
					<IconChevronUp size={12} stroke={2} />
				{:else}
					<IconChevronDown size={12} stroke={2} />
				{/if}
			</span>
		</button>

		{#if showEdit}
			<div class="mt-2 space-y-2">
				<div>
					<div class="mb-1 flex items-center justify-between">
						<label for="callsign" class="text-[11px] text-faint">Callsign</label>
						{#if room.joinState === 'approved'}
							<span class="text-[10px] font-mono text-amber">Locked in session</span>
						{:else}
							<button
								type="button"
								class="text-[10px] font-mono text-lamp hover:underline"
								onclick={() => window.dispatchEvent(new CustomEvent('an:open-profile-modal', { detail: { edit: true } }))}
							>
								Edit Profile ↗
							</button>
						{/if}
					</div>
					<input
						id="callsign"
						type="text"
						maxlength="24"
						autocomplete="off"
						disabled={room.joinState === 'approved'}
						class="w-full rounded border border-cream/10 bg-night/60 px-2.5 py-1 text-xs outline-none transition-colors {room.joinState === 'approved' ? 'text-taupe bg-night/40 cursor-not-allowed opacity-75' : 'text-cream focus:border-lamp/60'}"
						value={room.name}
						title={room.joinState === 'approved' ? 'Callsign cannot be changed after joining a room' : undefined}
						oninput={(e) => {
							if (room.joinState !== 'approved') {
								room.setName(e.currentTarget.value);
							}
						}}
					/>
					{#if room.joinState === 'approved'}
						<p class="mt-1 text-[10px] text-faint font-mono">Callsign cannot be changed while in room</p>
					{/if}
				</div>

				<div>
					<label for="intention" class="mb-1 block text-[11px] text-faint">What are you working on?</label>
					<input
						id="intention"
						type="text"
						maxlength="80"
						autocomplete="off"
						placeholder="one line is enough"
						class="w-full rounded border border-cream/10 bg-night/60 px-2.5 py-1 text-xs text-cream outline-none transition-colors placeholder:text-faint/60 focus:border-lamp/60"
						value={room.intention}
						oninput={(e) => room.setIntention(e.currentTarget.value)}
					/>
				</div>

				<div>
					<span class="mb-1 block text-[11px] text-faint">Mood</span>
					<div class="flex flex-wrap gap-1">
						{#each ['🎧 Locked in', '💻 Coding', '✍️ Writing', '🎨 Designing', '🐛 Bug hunting', '☕ Coffee run'] as mood}
							<button
								type="button"
								class="rounded-full px-2 py-0.5 text-[10px] transition-colors border {room.statusText === mood
									? 'border-lamp bg-lamp/15 text-lamp font-medium'
									: 'border-cream/10 bg-night/50 text-taupe hover:border-cream/25 hover:text-cream'}"
								onclick={() => room.setStatus(room.statusText === mood ? '' : mood)}
							>
								{mood}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
