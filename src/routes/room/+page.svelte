<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import Nav from '#lib/components/Nav.svelte';
	import Player from '#lib/components/Player.svelte';
	import QueuePanel from '#lib/components/QueuePanel.svelte';
	import Countdown from '#lib/components/Countdown.svelte';
	import PresencePanel from '#lib/components/PresencePanel.svelte';
	import NowPlayingBar from '#lib/components/NowPlayingBar.svelte';
	import ChatPanel from '#lib/components/ChatPanel.svelte';
	import RoomLobby from '#lib/components/RoomLobby.svelte';
	import JoinGate from '#lib/components/JoinGate.svelte';
	import JoinRequests from '#lib/components/JoinRequests.svelte';
	import ModeToggle from '#lib/components/ModeToggle.svelte';
	import DawnRitualModal from '#lib/components/DawnRitualModal.svelte';
	import { TELEGRAM_URL } from '#lib/config';
	import IconCopy from '@tabler/icons-svelte/icons/copy';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import IconLogout from '@tabler/icons-svelte/icons/logout';
	import IconTarget from '@tabler/icons-svelte/icons/target';
	import IconWaveSine from '@tabler/icons-svelte/icons/wave-sine';
	import IconSun from '@tabler/icons-svelte/icons/sun';

	let copied = $state(false);
	let showDawnModal = $state(false);

	onMount(() => room.init());

	const inRoom = $derived(room.joinState === 'approved');
	const gated = $derived(room.joinState === 'waiting' || room.joinState === 'rejected');

	async function copyLink(): Promise<void> {
		try {
			await navigator.clipboard.writeText(room.roomUrl());
			copied = true;
			window.setTimeout(() => (copied = false), 1800);
		} catch {}
	}
</script>

<svelte:head>
	<title>The Room · All Nighter</title>
</svelte:head>

<Nav />

<main class="min-h-[calc(100dvh-64px)] md:min-h-[calc(100dvh-68px)]">
	<section class="border-b border-cream/10 bg-night-2">
		<div class="mx-auto max-w-[1400px] px-5 py-10 md:py-12">
			<a href="/" class="inline-flex items-center gap-1.5 text-sm text-taupe transition-colors hover:text-cream">
				<IconArrowLeft size={15} stroke={1.5} />
				Tonight
			</a>
			<div class="mt-4 flex flex-wrap items-center gap-3">
				<h1 class="text-3xl font-semibold tracking-tight md:text-4xl">
					{#if inRoom}
						{room.title || 'The Room'}
					{:else if gated}
						Knocking
					{:else}
						The Room
					{/if}
				</h1>
				{#if inRoom}
					{#if room.mode === 'focus'}
						<span class="inline-flex items-center gap-1.5 rounded-full border border-lamp/40 bg-lamp/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lamp">
							<IconTarget size={11} stroke={2} />
							Focus
						</span>
					{:else}
						<span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]" style="border: 1px solid color-mix(in srgb, var(--color-amber) 40%, transparent); background: color-mix(in srgb, var(--color-amber) 10%, transparent); color: var(--color-amber)">
							<IconWaveSine size={11} stroke={2} />
							Break
						</span>
					{/if}
				{/if}
			</div>
			<p class="mt-2 max-w-[58ch] leading-relaxed text-taupe">
				{#if inRoom}
					One queue, one player, everyone awake. Share the room link with your crew.
				{:else if gated}
					Wait for a member to open the door.
				{:else}
					Open a room and the night starts with you, or knock on one already running.
				{/if}
			</p>
		</div>
	</section>

	{#if inRoom}
		<section class="mx-auto max-w-[1400px] px-5 py-6 md:py-8">
			{#if room.status !== 'online'}
				<div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-lamp/30 bg-lamp/8 px-4 py-2.5">
					<p class="text-sm text-cream">
						{room.status === 'connecting' ? 'Reconnecting to the room…' : 'Playing solo for now.'}
						<span class="text-taupe">Others may not hear changes yet.</span>
					</p>
					<button class="btn btn-ghost btn-sm" onclick={() => room.init()}>Retry</button>
				</div>
			{/if}
			<NowPlayingBar />
			<div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
				<div class="min-w-0">
					<div class="panel mb-3 flex flex-wrap items-center justify-between gap-2 px-4 py-2">
						<div class="flex items-center gap-2 text-xs text-taupe">
							<span class="h-1.5 w-1.5 rounded-full {room.state.playing ? 'bg-lamp soft-blink' : 'bg-faint'}"></span>
							{room.state.playing ? 'Playing' : 'Paused'}
							<span class="text-faint/70">·</span>
							{room.state.queue.length} up next · {room.awake.length} awake
						</div>
						<div class="flex items-center gap-1.5">
							{#if room.canSkip}
								<button
									class="btn btn-ghost btn-sm"
									onclick={() => room.skip()}
									disabled={room.state.queue.length === 0 && !room.state.current}
									title={room.isHost ? 'Host skip' : 'Solo skip'}
								>
									Skip
								</button>
							{:else}
								<span
									class="text-[11px] text-faint px-2"
									title="Only the host can skip when multiple people are in the room"
								>
									Host controls skip
								</span>
							{/if}
							<button class="btn btn-ghost btn-sm" onclick={async () => { try { await navigator.clipboard.writeText(room.roomUrl()); } catch {} }}>Share room</button>
						</div>
					</div>
					<Player />
					<QueuePanel />
				</div>
				<aside class="flex min-w-0 flex-col gap-4">
					<JoinRequests />
					<Countdown />
					<ModeToggle />
					<PresencePanel />
					<ChatPanel />

					<div class="panel flex flex-1 flex-col p-5">
						<div class="flex items-center justify-between gap-3">
							<h3 class="text-sm font-medium">Lately</h3>
							{#if room.status === 'online'}
								<span class="inline-flex items-center gap-2 rounded-full border border-cream/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-taupe">
									<span class="h-1.5 w-1.5 rounded-full bg-lamp"></span>
									in the room
								</span>
							{:else if room.status === 'connecting'}
								<span class="inline-flex items-center gap-2 rounded-full border border-cream/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-taupe">
									<span class="soft-blink h-1.5 w-1.5 rounded-full bg-lamp"></span>
									finding the room
								</span>
							{:else}
								<span class="inline-flex items-center gap-2 rounded-full border border-cream/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
									<span class="h-1.5 w-1.5 border border-faint rounded-full"></span>
									solo for now
								</span>
							{/if}
						</div>

						{#if room.log.length > 0}
							<ul class="num mt-3 space-y-1.5 text-xs leading-relaxed">
								{#each room.log as entry (entry.id)}
									<li class="truncate text-faint">
										<span class="text-taupe">{entry.who}</span>
										{entry.text}
									</li>
								{/each}
							</ul>
						{:else}
							<p class="num mt-3 text-xs leading-relaxed text-faint">quiet in here. add the first track.</p>
						{/if}

						<div class="mt-auto flex items-center justify-between gap-3 pt-5">
							<span class="num truncate text-xs text-faint">room / {room.room}</span>
							<button class="btn btn-ghost btn-sm" onclick={copyLink}>
								{#if copied}
									<IconCheck size={14} stroke={1.5} />
									Copied
								{:else}
									<IconCopy size={14} stroke={1.5} />
									Copy link
								{/if}
							</button>
						</div>
					</div>

					<button class="btn btn-primary w-full text-xs" onclick={() => (showDawnModal = true)}>
						<IconSun size={15} stroke={2} />
						Dawn ritual · Log tonight
					</button>

					<button class="btn btn-ghost w-full" onclick={() => room.leave()}>
						Step out
					</button>
				</aside>
			</div>
			<DawnRitualModal bind:open={showDawnModal} />
		</section>
	{:else if gated}
		<section class="mx-auto max-w-[1400px] px-5 py-10 md:py-16">
			<JoinGate />
		</section>
	{:else}
		<section class="mx-auto max-w-[1400px] px-5 py-6 md:py-8">
			<RoomLobby />
		</section>
	{/if}
</main>

<footer class="border-t border-cream/10">
	<div class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-7">
		<p class="num text-xs text-faint">All Nighter · built between 1 and 6 am</p>
		<p class="num text-xs text-faint">keep the tab open</p>
	</div>
</footer>
