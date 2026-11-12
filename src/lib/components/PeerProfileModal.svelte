<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import type { Peer } from '#lib/room/types';
	import { getUserProfileStats, type UserProfileStats, type Achievement } from '#lib/data/profile-stats';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconCrown from '@tabler/icons-svelte/icons/crown';
	import IconShieldCheck from '@tabler/icons-svelte/icons/shield-check';
	import IconShield from '@tabler/icons-svelte/icons/shield';
	import IconTarget from '@tabler/icons-svelte/icons/target';
	import IconClock from '@tabler/icons-svelte/icons/clock';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconDisc from '@tabler/icons-svelte/icons/disc';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import IconBolt from '@tabler/icons-svelte/icons/bolt';
	import IconAward from '@tabler/icons-svelte/icons/award';
	import IconPencil from '@tabler/icons-svelte/icons/pencil';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconLock from '@tabler/icons-svelte/icons/lock';
	import IconTrophy from '@tabler/icons-svelte/icons/trophy';

	let open = $state(false);
	let activePeer = $state<Peer | null>(null);
	let peerName = $state<string>('');

	const stats = $derived<UserProfileStats>(getUserProfileStats(peerName));

	const isHost = $derived(
		activePeer?.name === room.hostName() || (Boolean(activePeer?.self) && room.isHost)
	);

	const isAdmin = $derived(
		activePeer ? room.isAdmin(activePeer.id, activePeer.name) : false
	);

	const isSelf = $derived(
		Boolean(activePeer?.self) || (peerName.toLowerCase() === (room.name || '').toLowerCase())
	);

	const isAwakeInRoom = $derived(
		room.awake.some(
			(p) => p.name.toLowerCase() === peerName.toLowerCase() || (activePeer && p.id === activePeer.id)
		)
	);

	const roomTracks = $derived(
		room.state.queue.filter((t) => t.addedBy.toLowerCase() === peerName.toLowerCase())
	);

	const achievedBadges = $derived(stats.achievements.filter((a) => a.unlocked));

	function peerLocalTime(tz?: string): string {
		try {
			const options: Intl.DateTimeFormatOptions = {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			};
			if (tz) options.timeZone = tz;
			return new Intl.DateTimeFormat([], options).format(new Date());
		} catch {
			return '';
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

	function getTierBadgeClass(tier: Achievement['tier']): string {
		switch (tier) {
			case 'bronze':
				return 'border-amber-600/50 bg-gradient-to-br from-amber-700/25 via-amber-900/40 to-amber-950/80 text-amber-300 shadow-[0_0_12px_rgba(217,119,6,0.25)]';
			case 'silver':
				return 'border-slate-300/50 bg-gradient-to-br from-slate-400/20 via-slate-700/40 to-slate-900/80 text-slate-100 shadow-[0_0_12px_rgba(203,213,225,0.2)]';
			case 'gold':
				return 'border-yellow-400/60 bg-gradient-to-br from-yellow-500/25 via-amber-600/40 to-yellow-950/80 text-yellow-300 shadow-[0_0_16px_rgba(234,179,8,0.3)]';
			case 'neon':
				return 'border-violet-400/70 bg-gradient-to-br from-violet-500/25 via-fuchsia-600/35 to-violet-950/80 text-violet-200 shadow-[0_0_18px_rgba(168,85,247,0.35)]';
		}
	}

	function getTierCardClass(tier: Achievement['tier'], unlocked: boolean): string {
		if (!unlocked) {
			return 'border-cream/10 bg-[#080d0f]/90 hover:border-cream/20 hover:bg-[#0c1215] opacity-85 hover:opacity-100';
		}
		switch (tier) {
			case 'bronze':
				return 'border-amber-600/40 bg-gradient-to-br from-amber-950/30 via-[#0d0905] to-[#060a0b] shadow-[0_4px_20px_-6px_rgba(217,119,6,0.2)] hover:border-amber-500/65';
			case 'silver':
				return 'border-slate-400/40 bg-gradient-to-br from-slate-800/30 via-[#0c1215] to-[#060a0b] shadow-[0_4px_20px_-6px_rgba(148,163,184,0.2)] hover:border-slate-300/65';
			case 'gold':
				return 'border-yellow-500/45 bg-gradient-to-br from-amber-900/30 via-[#120f06] to-[#060a0b] shadow-[0_4px_25px_-6px_rgba(234,179,8,0.25)] hover:border-yellow-400/70';
			case 'neon':
				return 'border-violet-400/50 bg-gradient-to-br from-violet-950/35 via-[#0e0a19] to-[#060a0b] shadow-[0_4px_25px_-6px_rgba(168,85,247,0.3)] hover:border-violet-300/75';
		}
	}

	function getTierLabel(tier: Achievement['tier']): string {
		switch (tier) {
			case 'bronze':
				return '🥉 Bronze';
			case 'silver':
				return '🥈 Silver';
			case 'gold':
				return '🥇 Gold';
			case 'neon':
				return '💎 Mythic';
		}
	}

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				if (node.parentNode) {
					node.parentNode.removeChild(node);
				}
			}
		};
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
		}
	}

	onMount(() => {
		const onInspect = (e: Event) => {
			const detail = (e as CustomEvent<{ peer?: Peer; name?: string; id?: string }>).detail;
			if (!detail) return;

			if (detail.peer) {
				activePeer = detail.peer;
				peerName = detail.peer.name;
			} else if (detail.name) {
				peerName = detail.name;
				const matched = room.awake.find(
					(p) => p.name.toLowerCase() === detail.name!.toLowerCase() || (detail.id && p.id === detail.id)
				);
				activePeer = matched || {
					id: detail.id || detail.name,
					name: detail.name,
					avatar: undefined,
					ts: Date.now()
				};
			}

			if (peerName) {
				open = true;
			}
		};

		const onHostTransferred = () => {
			open = false;
		};

		window.addEventListener('an:inspect-peer', onInspect);
		window.addEventListener('an:host-transferred', onHostTransferred);
		return () => {
			window.removeEventListener('an:inspect-peer', onInspect);
			window.removeEventListener('an:host-transferred', onHostTransferred);
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		use:portal
		class="fixed inset-0 z-[100] flex items-center justify-center bg-night/90 p-3 sm:p-6 backdrop-blur-md overflow-hidden"
		role="dialog"
		aria-modal="true"
		aria-label="{peerName}'s Nocturnal Profile"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) open = false;
		}}
	>
		<div
			class="relative w-full max-w-lg max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-2xl border border-cream/20 bg-[#0a1012] shadow-2xl text-cream overflow-hidden my-auto"
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-4 sm:p-5 pb-3 border-b border-cream/10 shrink-0 bg-[#070c0e]">
				<div class="flex items-center gap-2">
					<span class="h-2 w-2 rounded-full {isAwakeInRoom ? 'bg-lamp animate-pulse' : 'bg-faint'}"></span>
					<span class="font-mono text-xs uppercase tracking-wider text-faint">
						{isSelf ? 'Your Profile' : 'Crew Profile'}
					</span>
				</div>
				<button
					type="button"
					class="rounded-lg p-1 text-faint transition-colors hover:text-cream hover:bg-cream/10"
					onclick={() => (open = false)}
					aria-label="Close"
				>
					<IconX size={17} stroke={1.5} />
				</button>
			</div>

			<!-- Scrollable Content Body -->
			<div class="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-4">
				<!-- Hero Identity Card -->
				<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-4 sm:p-5">
					<div class="flex items-start gap-4">
						<!-- Avatar -->
						<div class="relative shrink-0">
							{#if activePeer?.avatar}
								<img
									src={activePeer.avatar}
									alt={peerName}
									class="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border-2 border-lamp/40 bg-night shadow-md"
								/>
							{:else}
								{@const pColor = peerColor(peerName)}
								<span
									class="grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full {pColor.bg} {pColor.text} {pColor.border} text-2xl font-bold font-mono border-2 shadow-md"
								>
									{peerName.charAt(0).toUpperCase()}
								</span>
							{/if}
							{#if isAwakeInRoom}
								<span
									class="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-lamp border-2 border-[#060a0b]"
									title="Awake in this room right now"
								></span>
							{/if}
						</div>

						<!-- Callsign & Badges -->
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-1.5">
								<h3 class="font-mono text-lg sm:text-xl font-bold text-cream truncate leading-tight">
									{peerName}
								</h3>
								{#if isSelf}
									<span class="rounded bg-cream/10 px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider text-cream/80">
										You
									</span>
								{/if}
							</div>

							<!-- Role & Status Pills -->
							<div class="mt-2 flex flex-wrap items-center gap-1.5">
								{#if isHost}
									<span class="inline-flex items-center gap-1 rounded bg-amber-400/15 px-2 py-0.5 text-[10px] text-amber-300 font-mono border border-amber-400/30">
										<IconCrown size={11} stroke={2} />
										Room Host
									</span>
								{:else if isAdmin}
									<span class="inline-flex items-center gap-1 rounded bg-teal-500/15 px-2 py-0.5 text-[10px] text-aqua-foam font-mono border border-teal-500/30">
										<IconShieldCheck size={11} stroke={2} />
										Admin
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 rounded bg-cream/8 px-2 py-0.5 text-[10px] text-taupe font-mono border border-cream/15">
										Listener
									</span>
								{/if}

								{#if activePeer?.status}
									<span class="rounded-full bg-cream/10 px-2.5 py-0.5 text-[11px] text-lamp font-medium">
										{activePeer.status}
									</span>
								{/if}

								{#if isAwakeInRoom}
									<span class="inline-flex items-center gap-1 rounded-full bg-lamp/10 px-2 py-0.5 font-mono text-[10px] text-lamp">
										<span class="h-1 w-1 rounded-full bg-lamp"></span>
										Awake
									</span>
								{/if}
							</div>

							<!-- Clock & Timezone -->
							{#if activePeer?.tz}
								<p class="mt-2 text-xs text-faint font-mono flex items-center gap-1">
									<IconClock size={12} stroke={1.5} />
									<span>{peerLocalTime(activePeer.tz)}</span>
									<span class="text-faint/60">·</span>
									<span class="truncate">{activePeer.tz}</span>
								</p>
							{/if}
						</div>
					</div>

					<!-- Nocturnal Intention Quote -->
					{#if activePeer?.intention}
						<div class="mt-4 rounded-xl border border-lamp/25 bg-lamp/8 p-3.5">
							<div class="flex items-center gap-1.5 text-lamp font-mono text-[10px] uppercase tracking-wider font-semibold">
								<IconTarget size={13} stroke={2} />
								<span>Tonight's Intention</span>
							</div>
							<p class="mt-1.5 text-xs sm:text-sm text-cream italic leading-relaxed">
								“{activePeer.intention}”
							</p>
						</div>
					{/if}
				</div>

				<!-- Nocturnal Standing & Rank -->
				<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div class="flex items-center gap-3">
							<span class="grid h-11 w-11 place-items-center rounded-xl border border-lamp/35 bg-lamp/10 text-lamp shrink-0">
								<IconAward size={22} stroke={1.8} />
							</span>
							<div>
								<div class="flex items-center gap-2">
									<h4 class="font-mono text-base font-bold text-amber">{stats.rank.title}</h4>
									<span class="rounded-full bg-amber/15 border border-amber/30 px-2 py-0.5 font-mono text-[10px] font-bold text-amber">
										Lvl {stats.rank.level}
									</span>
								</div>
								<p class="text-[11px] text-taupe mt-0.5">
									{stats.unlockedCount} of {stats.totalAchievements} badges unlocked
								</p>
							</div>
						</div>
						<div class="text-right">
							<p class="text-[9px] font-mono uppercase tracking-wider text-faint">Focus Logged</p>
							<p class="text-base font-bold text-lamp font-mono">{stats.totalHoursFormatted}</p>
						</div>
					</div>

					{#if stats.rank.nextTitle !== 'Max Rank'}
						<div class="mt-3 pt-2.5 border-t border-cream/10">
							<div class="flex items-center justify-between text-[10px] text-faint font-mono mb-1">
								<span>To {stats.rank.nextTitle}</span>
								<span class="text-cream">{stats.rank.progress}%</span>
							</div>
							<div class="h-1.5 w-full rounded-full bg-night-3 overflow-hidden border border-cream/10">
								<div class="h-full rounded-full bg-gradient-to-r from-teal-500 to-lamp transition-all duration-500" style="width: {stats.rank.progress}%"></div>
							</div>
						</div>
					{/if}
				</div>

				<!-- 4-Grid Key Stats -->
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
					<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-2.5 text-center">
						<span class="grid h-6 w-6 mx-auto place-items-center rounded-lg bg-lamp/10 text-lamp mb-1">
							<IconMoon size={13} stroke={2} />
						</span>
						<p class="text-base font-bold font-mono text-cream">{stats.nightsCount}</p>
						<p class="text-[9px] font-mono uppercase tracking-wider text-faint mt-0.5">All-Nighters</p>
					</div>

					<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-2.5 text-center">
						<span class="grid h-6 w-6 mx-auto place-items-center rounded-lg bg-aqua-foam/10 text-aqua-foam mb-1">
							<IconDisc size={13} stroke={2} />
						</span>
						<p class="text-base font-bold font-mono text-cream">{stats.tracksQueued}</p>
						<p class="text-[9px] font-mono uppercase tracking-wider text-faint mt-0.5">Tracks Queued</p>
					</div>

					<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-2.5 text-center">
						<span class="grid h-6 w-6 mx-auto place-items-center rounded-lg bg-amber/10 text-amber mb-1">
							<IconSun size={13} stroke={2} />
						</span>
						<p class="text-base font-bold font-mono {stats.dawnRituals > 0 ? 'text-amber' : 'text-cream'}">{stats.dawnRituals}</p>
						<p class="text-[9px] font-mono uppercase tracking-wider text-faint mt-0.5">Sunrise Rituals</p>
					</div>

					<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-2.5 text-center">
						<span class="grid h-6 w-6 mx-auto place-items-center rounded-lg bg-yellow-400/10 text-yellow-300 mb-1">
							<IconBolt size={13} stroke={2} />
						</span>
						<p class="text-base font-bold font-mono text-cream">{stats.focusMinutes}m</p>
						<p class="text-[9px] font-mono uppercase tracking-wider text-faint mt-0.5">Focus Minutes</p>
					</div>
				</div>

				<!-- Achieved Badges & Milestones -->
				<div class="space-y-2.5">
					<div class="flex items-center justify-between border-b border-cream/10 pb-2">
						<div class="flex items-center gap-1.5">
							<IconTrophy size={15} stroke={1.8} class="text-amber" />
							<h4 class="text-xs font-mono uppercase tracking-wider text-faint">Trophy Cabinet</h4>
						</div>
						<span class="text-xs font-mono text-lamp font-bold">
							{stats.unlockedCount} / {stats.totalAchievements} Unlocked
						</span>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{#each stats.achievements as a (a.id)}
							<div
								class="relative flex flex-col justify-between rounded-xl border p-2.5 transition-all {getTierCardClass(a.tier, a.unlocked)}"
							>
								<div class="flex items-start gap-2.5 min-w-0">
									<div class="relative shrink-0">
										<span
											class="grid h-10 w-10 place-items-center rounded-xl border text-xl select-none {a.unlocked ? getTierBadgeClass(a.tier) : 'border-cream/15 bg-night-3 text-faint grayscale opacity-50'}"
										>
											{a.emoji}
										</span>
										{#if !a.unlocked}
											<span
												class="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-[#080d0f] border border-cream/25 text-faint shadow-sm"
											>
												<IconLock size={9} stroke={2} />
											</span>
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										<div class="flex items-center justify-between gap-1">
											<p class="text-xs font-semibold {a.unlocked ? 'text-cream' : 'text-cream/75'} truncate leading-tight">
												{a.title}
											</p>
											{#if a.unlocked}
												<span class="text-[9px] font-mono text-lamp font-bold shrink-0">✓ Done</span>
											{:else}
												<span class="text-[9px] font-mono text-faint shrink-0">
													{Math.min(100, Math.round((a.current / a.target) * 100))}%
												</span>
											{/if}
										</div>
										<p class="truncate text-[10px] text-taupe mt-0.5">{a.description}</p>
										<div class="flex items-center gap-2 mt-1">
											<span class="text-[8px] font-mono uppercase tracking-wider text-faint bg-cream/5 px-1 py-0.2 rounded border border-cream/10">
												{a.category}
											</span>
											<span class="text-[8px] font-mono text-taupe">
												{getTierLabel(a.tier)}
											</span>
										</div>
									</div>
								</div>

								{#if !a.unlocked}
									{@const pct = Math.min(100, Math.round((a.current / a.target) * 100))}
									<div class="mt-2 h-1 w-full rounded-full bg-night-3 overflow-hidden border border-cream/10">
										<div
											class="h-full rounded-full bg-gradient-to-r from-amber-500/60 to-lamp/60"
											style="width: {pct}%"
										></div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Current Room Contributions -->
				{#if roomTracks.length > 0}
					<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-3.5">
						<p class="text-xs font-mono uppercase tracking-wider text-faint flex items-center gap-1.5 mb-2">
							<IconMusic size={13} class="text-lamp" />
							<span>Tracks queued in this session ({roomTracks.length})</span>
						</p>
						<ul class="space-y-1.5 text-xs">
							{#each roomTracks as track}
								<li class="flex items-center justify-between gap-2 text-taupe">
									<span class="truncate text-cream/90">{track.title}</span>
									{#if track.channel}
										<span class="font-mono text-[10px] text-faint uppercase shrink-0">{track.channel}</span>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>

			<!-- Fixed Footer Actions -->
			<div class="flex flex-wrap items-center justify-between gap-2 p-4 sm:p-5 border-t border-cream/10 bg-[#070c0e] shrink-0">
				<div>
					{#if isSelf}
						<button
							type="button"
							class="btn btn-primary btn-sm text-xs inline-flex items-center gap-1.5"
							onclick={() => {
								open = false;
								window.dispatchEvent(new CustomEvent('an:open-profile-modal', { detail: { edit: true } }));
							}}
						>
							<IconPencil size={13} stroke={2} />
							<span>Edit Profile</span>
						</button>
					{:else if room.isHost && activePeer}
						<div class="flex flex-wrap items-center gap-2">
							<button
								type="button"
								class="btn btn-sm text-xs inline-flex items-center gap-1.5 {isAdmin ? 'btn-danger-outline' : 'btn-secondary text-aqua-foam border-teal-500/40'}"
								onclick={() => {
									if (activePeer) {
										room.toggleAdmin(activePeer.id, activePeer.name);
									}
								}}
							>
								{#if isAdmin}
									<IconShield size={13} stroke={2} />
									<span>Revoke Admin</span>
								{:else}
									<IconShieldCheck size={13} stroke={2} />
									<span>Make Room Admin</span>
								{/if}
							</button>

							<button
								type="button"
								class="btn btn-sm btn-ghost text-xs inline-flex items-center gap-1.5 text-amber hover:bg-amber/15 border border-amber/35 cursor-pointer transition-all"
								onclick={() => {
									if (activePeer) {
										window.dispatchEvent(
											new CustomEvent('an:open-transfer-host', {
												detail: { id: activePeer.id, name: activePeer.name, avatar: activePeer.avatar }
											})
										);
									}
								}}
								title="Transfer permanent room host ownership to {activePeer.name}"
							>
								<IconCrown size={13} stroke={2} />
								<span>Transfer Host</span>
							</button>
						</div>
					{:else}
						<span class="text-xs font-mono text-faint">Logged with All Nighter</span>
					{/if}
				</div>

				<div class="flex items-center gap-2">
					{#if peerName}
						<a
							href="/crew/{peerName}"
							class="btn btn-secondary btn-sm text-xs px-3 font-mono inline-flex items-center gap-1.5"
							onclick={() => (open = false)}
						>
							<span>Crew Profile</span>
						</a>
					{/if}
					<button
						type="button"
						class="btn btn-ghost btn-sm text-xs px-4"
						onclick={() => (open = false)}
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
