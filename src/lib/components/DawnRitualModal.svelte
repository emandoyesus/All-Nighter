<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconCopy from '@tabler/icons-svelte/icons/copy';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconTarget from '@tabler/icons-svelte/icons/target';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconUsers from '@tabler/icons-svelte/icons/users';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let copied = $state(false);

	const intentions = $derived(
		room.awake.map((p) => ({ who: p.name, text: p.intention })).filter((i) => !!i.text)
	);

	function generateZineMarkdown(): string {
		const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		const lines = [
			`# ${room.title || room.room} — All Nighter Log (${dateStr})`,
			``,
			`> "We made it till sunrise."`,
			``,
			`### The Roster (${room.awake.length} awake)`,
			...room.awake.map((p) => `- **${p.name}**${p.intention ? `: *“${p.intention}”*` : ''}`),
			``,
			`### Tracks Logged`,
			...(room.state.current ? [`- Now Playing: ${room.state.current.title} (${room.state.current.channel ?? 'YouTube'})`] : []),
			...room.state.queue.map((t) => `- ${t.title} (${t.addedBy})${t.dedication ? ` — dedicated: *“${t.dedication}”*` : ''}`),
			``,
			`*Logged with All Nighter.*`
		];
		return lines.join('\n');
	}

	async function copyZine(): Promise<void> {
		try {
			await navigator.clipboard.writeText(generateZineMarkdown());
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-night/85 p-4 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="relative w-full max-w-lg overflow-hidden rounded-card border border-lamp/30 bg-night-2 p-6 shadow-[0_0_50px_rgba(183,255,114,0.12)]"
		>
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-center gap-2">
					<span class="grid h-8 w-8 place-items-center rounded-full bg-lamp/15 text-lamp">
						<IconSun size={18} stroke={1.5} />
					</span>
					<div>
						<h2 class="text-lg font-semibold text-cream">Sunrise Ritual</h2>
						<p class="num text-xs text-faint">{room.title || room.room} · session log</p>
					</div>
				</div>
				<button class="icon-btn text-faint hover:text-cream" onclick={() => (open = false)} aria-label="Close">
					<IconX size={18} stroke={1.5} />
				</button>
			</div>

			<p class="mt-4 text-xs leading-relaxed text-taupe">
				Dawn closes the book. Here is what this room built, listened to, and worked on while the rest of the world was asleep.
			</p>

			<!-- Quick stats strip -->
			<div class="mt-4 grid grid-cols-3 gap-2 text-center">
				<div class="rounded-field border border-cream/10 bg-night/50 p-2.5">
					<div class="flex items-center justify-center gap-1 text-lamp">
						<IconUsers size={13} stroke={1.5} />
						<span class="num text-base font-semibold">{room.awake.length}</span>
					</div>
					<p class="num mt-0.5 text-[10px] text-faint uppercase">Awake now</p>
				</div>
				<div class="rounded-field border border-cream/10 bg-night/50 p-2.5">
					<div class="flex items-center justify-center gap-1 text-lamp">
						<IconMusic size={13} stroke={1.5} />
						<span class="num text-base font-semibold">{room.state.queue.length + (room.state.current ? 1 : 0)}</span>
					</div>
					<p class="num mt-0.5 text-[10px] text-faint uppercase">Tracks</p>
				</div>
				<div class="rounded-field border border-cream/10 bg-night/50 p-2.5">
					<div class="flex items-center justify-center gap-1 text-lamp">
						<IconTarget size={13} stroke={1.5} />
						<span class="num text-base font-semibold">{intentions.length}</span>
					</div>
					<p class="num mt-0.5 text-[10px] text-faint uppercase">Intentions</p>
				</div>
			</div>

			<!-- What the room worked on -->
			{#if intentions.length > 0}
				<div class="mt-4 max-h-40 overflow-y-auto rounded-field border border-cream/10 bg-night/40 p-3">
					<p class="mb-2 text-[11px] font-medium text-faint uppercase tracking-wider">Tonight's Intentions</p>
					<ul class="space-y-1.5 text-xs">
						{#each intentions as item}
							<li class="flex items-baseline gap-2">
								<span class="font-medium text-cream">{item.who}:</span>
								<span class="italic text-taupe">{item.text}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-cream/10 pt-4">
				<button class="btn btn-ghost btn-sm" onclick={copyZine}>
					{#if copied}
						<IconCheck size={14} stroke={2} class="text-lamp" />
						Copied Markdown
					{:else}
						<IconCopy size={14} stroke={1.5} />
						Copy Zine Entry
					{/if}
				</button>
				<button class="btn btn-primary btn-sm" onclick={() => (open = false)}>
					Keep the light on
				</button>
			</div>
		</div>
	</div>
{/if}
