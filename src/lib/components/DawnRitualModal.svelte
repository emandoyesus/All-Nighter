<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import { saveToMyNights, buildNightFromRoom } from '#lib/data/local-logbook';
	import { supabase, isSupabaseConfigured } from '#lib/supabase';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconCopy from '@tabler/icons-svelte/icons/copy';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconTarget from '@tabler/icons-svelte/icons/target';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconUsers from '@tabler/icons-svelte/icons/users';
	import IconBookmark from '@tabler/icons-svelte/icons/bookmark';
	import IconCode from '@tabler/icons-svelte/icons/code';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let copied = $state(false);
	let copiedJson = $state(false);
	let saved = $state(false);

	const intentions = $derived(
		room.awake.map((p) => ({ who: p.name, text: p.intention })).filter((i) => !!i.text)
	);

	function generateZineMarkdown(): string {
		const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		const all = room.getAllAttendees();
		const lines = [
			`# ${room.title || room.room} — All Nighter Log (${dateStr})`,
			``,
			`> "We made it till sunrise."`,
			``,
			`### The Roster (${room.awake.length} awake · ${all.length} nocturnal crew)`,
			...all.map((p) => `- **${p.name}**${p.intention ? `: *“${p.intention}”*` : ''}`),
			``,
			`### Tracks Logged`,
			...(room.state.current ? [`- Now Playing: ${room.state.current.title} (${room.state.current.channel ?? 'YouTube'})`] : []),
			...room.state.queue.map((t) => `- ${t.title} (${t.addedBy})${t.dedication ? ` — dedicated: *“${t.dedication}”*` : ''}`),
			``,
			`*Logged with All Nighter.*`
		];
		return lines.join('\n');
	}

	function getNightObject() {
		return buildNightFromRoom(
			room.room || 'all-nighter',
			room.title || 'The Night Session',
			room.awake,
			room.state.current,
			room.state.queue,
			room.getAllAttendees(),
			room.getAllSessionTracks()
		);
	}

	async function copyZine(): Promise<void> {
		try {
			await navigator.clipboard.writeText(generateZineMarkdown());
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {}
	}

	async function copyJsonSnippet(): Promise<void> {
		try {
			const night = getNightObject();
			await navigator.clipboard.writeText(JSON.stringify(night, null, 2));
			copiedJson = true;
			setTimeout(() => (copiedJson = false), 2000);
		} catch {}
	}

	async function handleSave(): Promise<void> {
		const night = getNightObject();
		saveToMyNights(night);

		// Automatically save to Supabase session_archives if configured (upsert to avoid duplicates)
		if (isSupabaseConfigured && supabase) {
			try {
				await supabase.from('session_archives').upsert(
					{
						slug: night.slug,
						title: night.title,
						started_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
						ended_at: new Date().toISOString(),
						attendees: room.awake.map((p) => ({ name: p.name, role: p.self ? 'Host' : 'Listener' })),
						playlist: night.tracklist,
						summary: night.note
					},
					{ onConflict: 'slug' }
				);
			} catch (err) {
				console.warn('Failed to archive to Supabase:', err);
			}
		}

		saved = true;
		setTimeout(() => (saved = false), 2500);
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
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === 'Escape') open = false; }} />

{#if open}
	<div
		use:portal
		class="fixed inset-0 z-[100] flex items-center justify-center bg-night/85 p-4 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) open = false; }}
	>
		<div
			class="relative w-full max-w-lg overflow-hidden rounded-card border border-cream/15 bg-night-2 p-6 shadow-2xl"
		>
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-center gap-2">
					<span class="grid h-8 w-8 place-items-center rounded-full bg-amber/15 text-amber">
						<IconSun size={18} stroke={1.5} />
					</span>
					<div>
						<h2 class="text-lg font-semibold text-cream"><span class="text-amber">Sunrise</span> Ritual</h2>
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
					<p class="mb-2 text-[11px] font-medium text-amber font-mono uppercase tracking-wider">Tonight's Intentions</p>
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

			<div class="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-cream/10 pt-4">
				<button class="btn btn-primary btn-sm" onclick={handleSave}>
					{#if saved}
						<IconCheck size={14} stroke={2} />
						Saved to My Logbook!
					{:else}
						<IconBookmark size={14} stroke={1.5} />
						Save to My Logbook
					{/if}
				</button>

				<div class="flex items-center gap-2">
					<button class="btn btn-ghost btn-sm text-xs" onclick={copyJsonSnippet} title="Copy JSON for src/lib/data/archive.ts">
						{#if copiedJson}
							<IconCheck size={14} stroke={2} class="text-lamp" />
							Copied JSON
						{:else}
							<IconCode size={14} stroke={1.5} />
							Export JSON
						{/if}
					</button>

					<button class="btn btn-ghost btn-sm text-xs" onclick={copyZine}>
						{#if copied}
							<IconCheck size={14} stroke={2} class="text-lamp" />
							Copied Markdown
						{:else}
							<IconCopy size={14} stroke={1.5} />
							Markdown
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
