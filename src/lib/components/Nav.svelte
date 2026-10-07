<script lang="ts">
	import { TELEGRAM_URL } from '#lib/config';
	import { room } from '#lib/room/room.svelte';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconBrandTelegram from '@tabler/icons-svelte/icons/brand-telegram';

	const live = $derived(room.state.playing);
</script>

<header class="sticky top-0 z-50 border-b border-cream/10 bg-night/85 backdrop-blur-md">
	<div class="mx-auto flex h-16 max-w-[1400px] items-center gap-5 px-5 md:h-[68px]">
		<a href="/" class="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight">
			<IconMoon size={20} stroke={1.5} class="text-lamp" />
			<span>All Nighter</span>
		</a>

		<div class="ml-auto flex items-center gap-5">
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

			<a href={TELEGRAM_URL} class="btn btn-primary text-[13px] sm:text-sm">
				<IconBrandTelegram size={16} stroke={1.5} />
				Join the Telegram
			</a>
		</div>
	</div>
</header>
