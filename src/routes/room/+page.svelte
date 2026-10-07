<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import Nav from '#lib/components/Nav.svelte';
	import Player from '#lib/components/Player.svelte';
	import QueuePanel from '#lib/components/QueuePanel.svelte';
	import Countdown from '#lib/components/Countdown.svelte';
	import PresencePanel from '#lib/components/PresencePanel.svelte';
	import { TELEGRAM_URL } from '#lib/config';
	import IconCopy from '@tabler/icons-svelte/icons/copy';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconBrandTelegram from '@tabler/icons-svelte/icons/brand-telegram';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';

	let copied = $state(false);

	onMount(() => room.init());

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
				Back to home
			</a>
			<h1 class="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">The room</h1>
			<p class="mt-2 max-w-[58ch] leading-relaxed text-taupe">
				One queue, one player, everyone awake. Share the room link with your crew.
			</p>
		</div>
	</section>

	<section class="mx-auto max-w-[1400px] px-5 py-6 md:py-8">
		<div class="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
			<div class="min-w-0">
				<Player />
				<QueuePanel />
			</div>
			<aside class="flex min-w-0 flex-col gap-4">
				<Countdown />
				<PresencePanel />

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

				<a href={TELEGRAM_URL} class="btn btn-ghost w-full">
					<IconBrandTelegram size={16} stroke={1.5} />
					Join the Telegram
				</a>
			</aside>
		</div>
	
</section>
</main>

<footer class="border-t border-cream/10">
	<div class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-7">
		<p class="num text-xs text-faint">All Nighter · built between 1 and 6 am</p>
		<p class="num text-xs text-faint">keep the tab open</p>
	</div>
</footer>
