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

	function getTierBadgeClass(tier: Achievement['tier']): string {
		switch (tier) {
			case 'bronze':
				return 'border-amber/40 bg-amber/10 text-amber';
			case 'silver':
				return 'border-teal-500/40 bg-teal-500/10 text-aqua-foam';
			case 'gold':
				return 'border-amber/50 bg-amber/15 text-amber';
			case 'neon':
				return 'border-violet-400/50 bg-violet-400/10 text-violet-300';
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

		window.addEventListener('an:inspect-peer', onInspect);
		return () => {
			window.removeEventListener('an:inspect-peer', onInspect);
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
								<span
									class="grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full bg-lamp/15 text-2xl font-bold font-mono text-lamp border-2 border-lamp/30 shadow-md"
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
				<div>
					<div class="flex items-center justify-between mb-2">
						<h4 class="text-xs font-mono uppercase tracking-wider text-faint">Achieved Badges</h4>
						<span class="text-xs font-mono text-lamp">{achievedBadges.length} Unlocked</span>
					</div>
					{#if achievedBadges.length > 0}
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{#each achievedBadges as a (a.id)}
								<div class="flex items-center gap-2.5 rounded-xl border border-cream/15 bg-[#060a0b] p-2.5 transition-colors">
									<span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-lg {getTierBadgeClass(a.tier)} shadow-sm select-none">
										{a.emoji}
									</span>
									<div class="min-w-0 flex-1">
										<div class="flex items-center justify-between gap-1">
											<p class="text-xs font-semibold text-cream truncate leading-tight">{a.title}</p>
											<span class="text-[9px] font-mono text-lamp font-bold shrink-0">✓ Done</span>
										</div>
										<p class="truncate text-[10px] text-taupe mt-0.5">{a.description}</p>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-4 text-center">
							<p class="text-xs text-taupe font-mono">No badges achieved yet</p>
						</div>
					{/if}
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
					{:else}
						<span class="text-xs font-mono text-faint">Logged with All Nighter</span>
					{/if}
				</div>

				<div class="flex items-center gap-2">
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
