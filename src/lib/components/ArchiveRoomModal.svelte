<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import IconUsers from '@tabler/icons-svelte/icons/users';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconBookmark from '@tabler/icons-svelte/icons/bookmark';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let isArchiving = $state(false);

	const totalTracks = $derived(
		(room.state.current ? 1 : 0) + room.state.queue.length
	);

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

	async function handleArchive(): Promise<void> {
		if (isArchiving) return;
		isArchiving = true;
		try {
			await room.archiveRoom();
			open = false;
		} finally {
			isArchiving = false;
		}
	}

	function handleClose(): void {
		if (isArchiving) return;
		open = false;
	}
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === 'Escape') handleClose(); }} />

{#if open}
	<div
		use:portal
		class="fixed inset-0 z-[100] flex items-center justify-center bg-night/90 p-4 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		aria-labelledby="archive-room-title"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
	>
		<div
			class="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber/30 bg-[#0a1012] p-5 sm:p-6 shadow-2xl text-cream animate-in fade-in zoom-in-95 duration-150"
		>
			<!-- Header -->
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-center gap-2.5">
					<span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber/40 bg-amber/15 text-amber">
						<IconSun size={19} stroke={1.8} />
					</span>
					<div>
						<h3 id="archive-room-title" class="text-base sm:text-lg font-semibold text-cream leading-tight">
							Archive Room Session
						</h3>
						<p class="text-xs text-amber font-mono">Dawn reached · Sunrise ritual</p>
					</div>
				</div>
				<button
					type="button"
					class="rounded-lg p-1 text-faint hover:text-cream hover:bg-cream/10 transition-colors"
					onclick={handleClose}
					aria-label="Close dialog"
				>
					<IconX size={18} stroke={1.5} />
				</button>
			</div>

			<!-- Sunrise Celebration Box -->
			<div class="mt-4 rounded-xl border border-amber/25 bg-amber/10 p-3.5">
				<div class="flex items-start gap-2.5">
					<IconSun size={16} stroke={2} class="text-amber shrink-0 mt-0.5" />
					<div class="text-xs leading-relaxed text-cream/90">
						<p class="font-semibold text-amber">Dawn closes the book</p>
						<p class="mt-1 text-taupe">
							You and your crew made it till sunrise. Archiving will finalize <span class="text-cream font-medium">“{room.title || room.room}”</span>, save the tracklist and roster to everyone’s personal logbook, and wrap up the session.
						</p>
					</div>
				</div>
			</div>

			<!-- Session Stats Snapshot -->
			<div class="mt-3.5 grid grid-cols-2 gap-2 text-xs font-mono">
				<div class="rounded-lg border border-cream/10 bg-[#060a0b] p-2.5 flex items-center gap-2">
					<span class="grid h-7 w-7 place-items-center rounded bg-lamp/15 text-lamp shrink-0">
						<IconUsers size={14} stroke={1.8} />
					</span>
					<div>
						<p class="text-[10px] text-faint uppercase">Crew Awake</p>
						<p class="text-sm font-bold text-lamp">{room.awake.length} member{room.awake.length === 1 ? '' : 's'}</p>
					</div>
				</div>

				<div class="rounded-lg border border-cream/10 bg-[#060a0b] p-2.5 flex items-center gap-2">
					<span class="grid h-7 w-7 place-items-center rounded bg-amber/15 text-amber shrink-0">
						<IconMusic size={14} stroke={1.8} />
					</span>
					<div>
						<p class="text-[10px] text-faint uppercase">Tracks Logged</p>
						<p class="text-sm font-bold text-amber">{totalTracks} track{totalTracks === 1 ? '' : 's'}</p>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="mt-5 flex items-center justify-end gap-2 border-t border-cream/10 pt-3.5">
				<button
					type="button"
					class="btn btn-ghost btn-sm text-xs px-3.5 text-taupe hover:text-cream"
					onclick={handleClose}
					disabled={isArchiving}
				>
					Keep Session Open
				</button>
				<button
					type="button"
					disabled={isArchiving}
					class="btn btn-amber btn-sm text-xs px-4 py-2 font-mono flex items-center gap-1.5 font-medium cursor-pointer shadow-md transition-all hover:scale-[1.02]"
					onclick={handleArchive}
				>
					<IconBookmark size={14} stroke={2} />
					<span>{isArchiving ? 'Archiving...' : 'Confirm & Archive'}</span>
				</button>
			</div>
		</div>
	</div>
{/if}
