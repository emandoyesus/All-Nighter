<script lang="ts">
	import { TELEGRAM_URL } from '#lib/config';
	import { room } from '#lib/room/room.svelte';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconBrandTelegram from '@tabler/icons-svelte/icons/brand-telegram';
	import IconMenu2 from '@tabler/icons-svelte/icons/menu-2';
	import IconX from '@tabler/icons-svelte/icons/x';

	const live = $derived(room.state.playing);
	let open = $state(false);
</script>

<header class="sticky top-0 z-50 border-b border-cream/10 bg-night/85 backdrop-blur-md">
	<div class="mx-auto flex h-16 max-w-[1400px] items-center gap-5 px-5 md:h-[68px]">
		<a href="/" class="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight">
			<IconMoon size={20} stroke={1.5} class="text-lamp" />
			<span>All Nighter</span>
		</a>

		<div class="ml-auto flex items-center gap-3 sm:gap-5">
			<nav class="hidden items-center gap-6 text-sm text-taupe md:flex lg:gap-7">
				<a class="transition-colors hover:text-cream" href="/room">The room</a>
				<a class="transition-colors hover:text-cream" href="/#nights">How a night runs</a>
				<a class="transition-colors hover:text-cream" href="/archive">Archive</a>
			</nav>

			{#if live}
				<span
					class="hidden items-center gap-2 rounded-full border border-lamp/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-lamp sm:inline-flex"
				>
					<span class="soft-blink h-1.5 w-1.5 rounded-full bg-lamp"></span>
					On air
				</span>
			{/if}

			<a href={TELEGRAM_URL} class="btn btn-primary hidden text-[13px] sm:inline-flex sm:text-sm">
				<IconBrandTelegram size={16} stroke={1.5} />
				Join the Telegram
			</a>

			<button
				class="icon-btn text-cream md:hidden"
				onclick={() => (open = !open)}
				aria-label={open ? 'Close menu' : 'Open menu'}
				aria-expanded={open}
			>
				{#if open}
					<IconX size={20} stroke={1.5} />
				{:else}
					<IconMenu2 size={20} stroke={1.5} />
				{/if}
			</button>
		</div>
	</div>

	{#if open}
		<div class="border-t border-cream/10 bg-night/95 px-5 py-4 backdrop-blur-lg md:hidden">
			<nav class="flex flex-col gap-2.5 text-sm">
				<a
					class="rounded-field px-3 py-2 text-cream transition-colors hover:bg-cream/5"
					href="/room"
					onclick={() => (open = false)}
				>
					The room
				</a>
				<a
					class="rounded-field px-3 py-2 text-taupe transition-colors hover:bg-cream/5 hover:text-cream"
					href="/#nights"
					onclick={() => (open = false)}
				>
					How a night runs
				</a>
				<a
					class="rounded-field px-3 py-2 text-taupe transition-colors hover:bg-cream/5 hover:text-cream"
					href="/archive"
					onclick={() => (open = false)}
				>
					Archive
				</a>
				<div class="pt-2">
					<a
						href={TELEGRAM_URL}
						class="btn btn-primary w-full text-xs"
						onclick={() => (open = false)}
					>
						<IconBrandTelegram size={15} stroke={1.5} />
						Join the Telegram
					</a>
				</div>
			</nav>
		</div>
	{/if}
</header>
