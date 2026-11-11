<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import Nav from '#lib/components/Nav.svelte';
	import Player from '#lib/components/Player.svelte';
	import QueuePanel from '#lib/components/QueuePanel.svelte';
	import Countdown from '#lib/components/Countdown.svelte';
	import ChatPanel from '#lib/components/ChatPanel.svelte';
	import PresencePanel from '#lib/components/PresencePanel.svelte';
	import RoomLobby from '#lib/components/RoomLobby.svelte';
	import JoinGate from '#lib/components/JoinGate.svelte';
	import JoinRequests from '#lib/components/JoinRequests.svelte';
	import ModeToggle from '#lib/components/ModeToggle.svelte';
	import DawnRitualModal from '#lib/components/DawnRitualModal.svelte';
	import DeleteRoomModal from '#lib/components/DeleteRoomModal.svelte';
	import ArchiveRoomModal from '#lib/components/ArchiveRoomModal.svelte';
	import ShareRoomModal from '#lib/components/ShareRoomModal.svelte';
	import RoomAuthGate from '#lib/components/RoomAuthGate.svelte';
	import { auth } from '#lib/auth.svelte';
	import { isSupabaseConfigured } from '#lib/supabase';
	import { TELEGRAM_URL } from '#lib/config';
	import IconShare from '@tabler/icons-svelte/icons/share';
	import IconCopy from '@tabler/icons-svelte/icons/copy';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import IconLogout from '@tabler/icons-svelte/icons/logout';
	import IconTarget from '@tabler/icons-svelte/icons/target';
	import IconWaveSine from '@tabler/icons-svelte/icons/wave-sine';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import IconX from '@tabler/icons-svelte/icons/x';

	let copied = $state(false);
	let showDawnModal = $state(false);
	let showDeleteModal = $state(false);
	let showArchiveModal = $state(false);
	let showShareModal = $state(false);

	onMount(() => {
		room.init();

		const handleOpenShare = () => (showShareModal = true);
		window.addEventListener('an:open-share-modal', handleOpenShare);

		return () => {
			window.removeEventListener('an:open-share-modal', handleOpenShare);
		};
	});

	const inRoom = $derived(room.joinState === 'approved');
	const gated = $derived(room.joinState === 'waiting' || room.joinState === 'rejected');

	async function copyLink(): Promise<void> {
		try {
			await navigator.clipboard.writeText(room.inviteUrl(room.room));
			copied = true;
			window.setTimeout(() => (copied = false), 1800);
		} catch {}
	}
</script>

<svelte:head>
	<title>{room.title ? `${room.title} · All Nighter` : 'The Room · All Nighter'}</title>
	<meta property="og:type" content="music.radio_station" />
	<meta property="og:site_name" content="All Nighter" />
	<meta property="og:title" content="{room.title || 'The Room'} · All Nighter" />
	<meta property="og:description" content="One synchronized room. One shared track queue. Everyone awake and building till dawn." />
	<meta property="og:image" content="https://all-nighter.pro.et/og-image.png" />
	<meta property="og:image:secure_url" content="https://all-nighter.pro.et/og-image.png" />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="{room.title || 'The Room'} · All Nighter" />
	<meta name="twitter:description" content="One synchronized room. One shared track queue. Everyone awake and building till dawn." />
	<meta name="twitter:image" content="https://all-nighter.pro.et/og-image.png" />
</svelte:head>

<Nav />

{#if !auth.isAuthenticated}
	{#if auth.loading}
		<div class="flex min-h-[calc(100dvh-64px)] md:min-h-[calc(100dvh-68px)] items-center justify-center bg-night">
			<p class="font-mono text-xs text-faint animate-pulse">Checking night session...</p>
		</div>
	{:else}
		<!-- Standalone Sign In Room view for users with no profile -->
		<div class="flex min-h-[calc(100dvh-64px)] md:min-h-[calc(100dvh-68px)] flex-col items-center justify-center bg-night p-4 sm:p-6">
			<div class="w-full max-w-md my-auto py-8">
				<a href="/" class="mb-4 inline-flex items-center gap-1.5 text-xs text-taupe transition-colors hover:text-cream font-mono">
					<IconArrowLeft size={14} stroke={1.5} />
					Tonight
				</a>
				<RoomAuthGate />
			</div>
		</div>
	{/if}
{:else}
	<main class="min-h-[calc(100dvh-64px)] md:min-h-[calc(100dvh-68px)]">
		{#if room.roomAlert}
			<div class="mx-auto max-w-[1440px] px-3 sm:px-5 pt-3">
				<div
					class="flex items-center justify-between gap-3 rounded-field border px-4 py-2.5 text-xs font-mono transition-all {room.roomAlert.type === 'archived' ? 'border-amber/40 bg-amber/10 text-amber' : 'border-ruby/40 bg-ruby/10 text-ruby'}"
				>
					<div class="flex items-center gap-2 flex-wrap">
						{#if room.roomAlert.type === 'archived'}
							<IconSun size={15} stroke={2} />
						{:else}
							<span class="h-1.5 w-1.5 rounded-full bg-ruby"></span>
						{/if}
						<span>{room.roomAlert.message}</span>
						{#if room.roomAlert.slug}
							<a href="/archive/{room.roomAlert.slug}" class="underline hover:text-cream ml-1 font-semibold">
								View in Logbook →
							</a>
						{/if}
					</div>
					<button
						class="icon-btn text-faint hover:text-cream text-xs"
						onclick={() => (room.roomAlert = null)}
						aria-label="Dismiss alert"
					>
						<IconX size={14} stroke={1.5} />
					</button>
				</div>
			</div>
		{/if}

		{#if inRoom}
			<!-- Compact Room Header -->
			<section class="border-b border-cream/10 bg-night-2/90 px-3 sm:px-5 py-2 sm:py-2.5 backdrop-blur-md sticky top-0 z-40">
				<div class="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2">
					<div class="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
						<a href="/" class="inline-flex items-center gap-1 text-xs text-taupe transition-colors hover:text-cream font-mono">
							<IconArrowLeft size={13} stroke={1.5} />
							Tonight
						</a>
						<span class="text-faint/40">/</span>
						<h1 class="truncate text-sm sm:text-base font-semibold tracking-tight text-cream">
							{room.title || 'The Room'}
						</h1>
						{#if room.state.isPrivate}
							<span class="inline-flex items-center gap-1 rounded bg-amber-400/10 px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider text-amber-300 border border-amber-400/30">
								Private
							</span>
						{:else}
							<span class="inline-flex items-center gap-1 rounded bg-lamp/10 px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider text-lamp border border-lamp/30">
								Public
							</span>
						{/if}
						{#if room.mode === 'focus'}
							<span class="inline-flex items-center gap-1 rounded bg-amber-400/10 px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider text-amber-300 border border-amber-400/30">
								<IconTarget size={10} stroke={2} />
								Focus
							</span>
						{:else}
							<span class="inline-flex items-center gap-1 rounded bg-lamp/10 px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider text-lamp border border-lamp/30">
								<IconWaveSine size={10} stroke={2} />
								Normal
							</span>
						{/if}

						<!-- AMBIENT AWAKE BADGE -->
						<a
							href="#crew-roster"
							class="inline-flex items-center gap-1.5 rounded-full border border-lamp/40 bg-lamp/10 px-2 py-0.5 font-mono text-[11px] text-lamp font-medium hover:border-lamp transition-colors"
							title="Click to view crew roster"
						>
							<span class="h-1.5 w-1.5 rounded-full bg-lamp animate-pulse"></span>
							<span>{room.awake.length} awake</span>
						</a>
					</div>

					<div class="flex items-center gap-1.5">
						<button
							class="btn btn-secondary btn-sm text-xs py-1 px-3 flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-lamp/40 transition-all font-medium"
							onclick={() => (showShareModal = true)}
							title="Share room and invite friends"
						>
							<IconShare size={13} stroke={1.8} class="text-lamp" />
							<span>Share Room</span>
						</button>
						<button class="btn btn-amber btn-sm text-xs py-1 px-2.5" onclick={() => (showDawnModal = true)} title="Log room session">
							<IconSun size={13} stroke={2} />
							Log
						</button>
						<button
							class="btn btn-danger-outline btn-sm text-xs py-1 px-2 font-mono"
							onclick={() => room.leave()}
							title="Step out of room"
						>
							Leave
						</button>
					</div>
				</div>
			</section>

			<!-- Room Workspace -->
			<section class="mx-auto max-w-[1440px] px-3 sm:px-4 py-3 md:py-4 pb-16">
				{#if room.status !== 'online'}
					<div class="mb-3 flex flex-wrap items-center justify-between gap-2 rounded border border-lamp/30 bg-lamp/8 px-3 py-1.5 text-xs text-cream">
						<p>
							{room.status === 'connecting' ? 'Reconnecting to the room…' : 'Playing solo for now.'}
						</p>
						<button class="btn btn-ghost btn-sm text-xs py-0.5 px-2" onclick={() => room.init()}>Retry</button>
					</div>
				{/if}

				{#if room.mode === 'focus'}
					<!-- Focus Mode: Rolling CD on left; Room Mode on right (No music queue) -->
					<div class="grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] animate-in fade-in duration-200">
						<!-- Left: Music Space (Rolling CD only, queue hidden) -->
						<div class="min-w-0 flex flex-col gap-3">
							<Player />
						</div>

						<!-- Right: Room Mode -->
						<aside class="flex min-w-0 flex-col gap-3">
							<ModeToggle />
						</aside>
					</div>
				{:else}
					<!-- Normal Collaborative Workspace -->
					<div class="grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
						<div class="min-w-0 flex flex-col gap-3">
							<Player />
							<QueuePanel />
						</div>
						<aside class="flex min-w-0 flex-col gap-3">
							<JoinRequests />
							<div id="crew-roster">
								<PresencePanel />
							</div>
							<ModeToggle />
							<Countdown />
							<ChatPanel />

							{#if room.isHost}
								<div class="pt-1 flex flex-col gap-2">
									{#if room.isDawn}
										<button
											class="btn btn-ghost text-amber hover:bg-amber/10 w-full text-[11px] font-mono tracking-wider py-1.5 border border-amber/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
											onclick={() => (showArchiveModal = true)}
											title="Archive room session to logbook"
										>
											<IconSun size={13} stroke={2} class="text-amber" />
											Archive room session (Dawn reached)
										</button>
									{:else}
										<button
											class="btn btn-ghost text-ruby hover:bg-ruby/10 w-full text-[11px] font-mono tracking-wider py-1.5 border border-ruby/20 hover:border-ruby transition-all flex items-center justify-center gap-1.5 group cursor-pointer"
											onclick={() => (showDeleteModal = true)}
											title="Close and delete the room session"
										>
											<span class="soft-blink h-1.5 w-1.5 rounded-full bg-ruby"></span>
											Delete room session
										</button>
									{/if}
								</div>
							{/if}
						</aside>
					</div>
				{/if}
				<DawnRitualModal bind:open={showDawnModal} />
				<ArchiveRoomModal bind:open={showArchiveModal} />
				<DeleteRoomModal bind:open={showDeleteModal} />
				<ShareRoomModal bind:open={showShareModal} />
			</section>
		{:else if gated}
			<section class="border-b border-cream/10 bg-night-2">
				<div class="mx-auto max-w-[1400px] px-5 py-8 md:py-10">
					<a href="/" class="inline-flex items-center gap-1.5 text-sm text-taupe transition-colors hover:text-cream">
						<IconArrowLeft size={15} stroke={1.5} />
						Tonight
					</a>
					<h1 class="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Knocking</h1>
				</div>
			</section>
			<section class="mx-auto max-w-[1400px] px-5 py-10 md:py-16">
				<JoinGate />
			</section>
		{:else}
			<section class="border-b border-cream/10 bg-night-2">
				<div class="mx-auto max-w-[1400px] px-5 py-6 md:py-8">
					<a href="/" class="inline-flex items-center gap-1.5 text-sm text-taupe transition-colors hover:text-cream">
						<IconArrowLeft size={15} stroke={1.5} />
						Tonight
					</a>
					<div class="mt-2 flex items-center justify-between">
						<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">The Room</h1>
					</div>
					<p class="mt-1 text-sm text-taupe">Open a room and the night starts with you, or knock on one already running.</p>
				</div>
			</section>
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
