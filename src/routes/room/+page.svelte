<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import Nav from '#lib/components/Nav.svelte';
	import Player from '#lib/components/Player.svelte';
	import QueuePanel from '#lib/components/QueuePanel.svelte';
	import Countdown from '#lib/components/Countdown.svelte';
	import NowPlayingBar from '#lib/components/NowPlayingBar.svelte';
	import ChatPanel from '#lib/components/ChatPanel.svelte';
	import RoomLobby from '#lib/components/RoomLobby.svelte';
	import JoinGate from '#lib/components/JoinGate.svelte';
	import JoinRequests from '#lib/components/JoinRequests.svelte';
	import ModeToggle from '#lib/components/ModeToggle.svelte';
	import DawnRitualModal from '#lib/components/DawnRitualModal.svelte';
	import RoomAuthGate from '#lib/components/RoomAuthGate.svelte';
	import { auth } from '#lib/auth.svelte';
	import { isSupabaseConfigured } from '#lib/supabase';
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

{#if !auth.isAuthenticated}
	{#if auth.loading}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-night">
			<p class="font-mono text-xs text-faint animate-pulse">Checking night session...</p>
		</div>
	{:else}
		<!-- Standalone Sign In Room view for users with no profile -->
		<div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-night p-4 sm:p-6 overflow-y-auto">
			<div class="w-full max-w-md my-auto">
				<a href="/" class="mb-4 inline-flex items-center gap-1.5 text-xs text-taupe transition-colors hover:text-cream font-mono">
					<IconArrowLeft size={14} stroke={1.5} />
					Tonight
				</a>
				<RoomAuthGate />
			</div>
		</div>
	{/if}
{:else}
	<Nav />

	<main class="min-h-[calc(100dvh-64px)] md:min-h-[calc(100dvh-68px)]">
		<section class="border-b border-cream/10 bg-night-2">
			<div class="mx-auto max-w-[1400px] px-5 py-10 md:py-12">
				<a href="/" class="inline-flex items-center gap-1.5 text-sm text-taupe transition-colors hover:text-cream">
					<IconArrowLeft size={15} stroke={1.5} />
					Tonight
				</a>
				<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
					<div class="flex items-center gap-3">
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
								<span class="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-300">
									<IconTarget size={11} stroke={2} />
									Focus
								</span>
							{:else}
								<span class="inline-flex items-center gap-1.5 rounded-full border border-lamp/40 bg-lamp/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lamp">
									<IconWaveSine size={11} stroke={2} />
									Normal
								</span>
							{/if}
						{/if}
					</div>

					{#if inRoom}
						<div class="flex items-center gap-2">
							<button class="btn btn-ghost btn-sm" onclick={copyLink} title="Copy direct room invite link">
								{#if copied}
									<IconCheck size={14} stroke={1.5} />
									Copied
								{:else}
									<IconCopy size={14} stroke={1.5} />
									Share link
								{/if}
							</button>
							<button class="btn btn-primary btn-sm text-xs" onclick={() => (showDawnModal = true)}>
								<IconSun size={14} stroke={2} />
								Log session
							</button>
						</div>
					{/if}
				</div>
				<p class="mt-2 max-w-[58ch] leading-relaxed text-taupe">
					{#if inRoom}
						One queue, one player, everyone awake. Relax in Normal mode or toggle Focus to sprint.
					{:else if gated}
						Wait for a member to open the door.
					{:else}
						Open a room and the night starts with you, or knock on one already running.
					{/if}
				</p>
			</div>
		</section>

		{#if inRoom}
			<section class="mx-auto max-w-[1400px] px-5 py-6 md:py-8 pb-28 md:pb-32">
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
					<div class="min-w-0 flex flex-col gap-4">
						<Player />
						<QueuePanel />
					</div>
					<aside class="flex min-w-0 flex-col gap-4">
						<JoinRequests />
						<Countdown />
						<ModeToggle />
						<ChatPanel />

						<!-- Red Light Room Actions -->
						<div class="flex flex-col gap-2 pt-2">
							<button
								class="btn btn-danger w-full text-xs font-mono tracking-wider transition-all"
								onclick={() => room.leave()}
								title="Leave the current room session"
							>
								<span class="h-2 w-2 rounded-full bg-ruby"></span>
								Step out of room
							</button>

							{#if room.isHost}
								<button
									class="btn btn-danger-outline w-full text-[11px] font-mono tracking-wider transition-all"
									onclick={() => {
										if (confirm('Delete this room session and close the door for everyone?')) {
											room.leave();
										}
									}}
									title="Close and delete the room session"
								>
									<span class="soft-blink h-1.5 w-1.5 rounded-full bg-ruby"></span>
									Delete room session
								</button>
							{/if}
						</div>
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

	<footer class="border-t border-cream/10 {inRoom ? 'mb-16 sm:mb-20' : ''}">
		<div class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-7">
			<p class="num text-xs text-faint">All Nighter · built between 1 and 6 am</p>
			<p class="num text-xs text-faint">keep the tab open</p>
		</div>
	</footer>
{/if}
