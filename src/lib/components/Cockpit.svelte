<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import { TELEGRAM_URL } from '#lib/config';
	import { reveal } from '#lib/reveal';
	import Player from './Player.svelte';
	import QueuePanel from './QueuePanel.svelte';
	import Countdown from './Countdown.svelte';
	import PresencePanel from './PresencePanel.svelte';
	import IconCopy from '@tabler/icons-svelte/icons/copy';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconBrandTelegram from '@tabler/icons-svelte/icons/brand-telegram';

	let copied = $state(false);

	onMount(() => room.init());

	async function copyLink(): Promise<void> {
		try {
			await navigator.clipboard.writeText(room.roomUrl());
			copied = true;
			window.setTimeout(() => (copied = false), 1800);
		} catch {
			/* clipboard blocked, the URL is in the address bar anyway */
		}
	}
</script>

<section id="room" class="relative border-y border-cream/10 bg-night-2">
	<div class="mx-auto max-w-[1400px] px-5 py-16 md:py-20">
		<div use:reveal>
			<p class="eyebrow">Live session</p>
			<h2 class="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">The room</h2>
			<p class="mt-3 max-w-[58ch] leading-relaxed text-taupe">
				Playback, queue, and who is awake. Everyone shares the aux; the crate fills in when the
				queue runs dry.
			</p>
		</div>

		<div class="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
			<div class="min-w-0" use:reveal={80}>
				<Player />
				<QueuePanel />
			</div>

			<aside class="flex min-w-0 flex-col gap-4" use:reveal={160}>
				<Countdown />
				<PresencePanel />

				<div class="panel flex flex-1 flex-col p-5">
					<div class="flex items-center justify-between gap-3">
						<h3 class="text-sm font-medium">Lately</h3>
						{#if room.status === 'online'}
							<span
								class="inline-flex items-center gap-2 rounded-full border border-cream/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-taupe"
							>
								<span class="h-1.5 w-1.5 rounded-full bg-lamp"></span>
								in the room
							</span>
						{:else if room.status === 'connecting'}
							<span
								class="inline-flex items-center gap-2 rounded-full border border-cream/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-taupe"
							>
								<span class="soft-blink h-1.5 w-1.5 rounded-full bg-lamp"></span>
								finding the room
							</span>
						{:else}
							<span
								class="inline-flex items-center gap-2 rounded-full border border-cream/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-faint"
							>
								<span class="h-1.5 w-1.5 rounded-full border border-faint"></span>
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
						<p class="num mt-3 text-xs leading-relaxed text-faint">
							quiet in here. add the first track.
						</p>
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
	</div>
</section>
