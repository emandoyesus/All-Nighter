<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import IconAlertTriangle from '@tabler/icons-svelte/icons/alert-triangle';
	import IconTrash from '@tabler/icons-svelte/icons/trash';
	import IconX from '@tabler/icons-svelte/icons/x';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let confirmInput = $state('');
	let isDeleting = $state(false);

	const isMatch = $derived(
		confirmInput.trim().toLowerCase() === (room.room || '').toLowerCase()
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

	async function handleDelete(): Promise<void> {
		if (!isMatch || isDeleting) return;
		isDeleting = true;
		try {
			await room.deleteRoom();
			open = false;
			confirmInput = '';
		} finally {
			isDeleting = false;
		}
	}

	function handleClose(): void {
		open = false;
		confirmInput = '';
	}
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === 'Escape') handleClose(); }} />

{#if open}
	<div
		use:portal
		class="fixed inset-0 z-[100] flex items-center justify-center bg-night/90 p-4 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-room-title"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
	>
		<div
			class="relative w-full max-w-md overflow-hidden rounded-2xl border border-ruby/30 bg-[#0d090a] p-5 sm:p-6 shadow-2xl text-cream animate-in fade-in zoom-in-95 duration-150"
		>
			<!-- Header -->
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-center gap-2.5">
					<span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-ruby/40 bg-ruby/15 text-ruby">
						<IconAlertTriangle size={20} stroke={2} />
					</span>
					<div>
						<h3 id="delete-room-title" class="text-base sm:text-lg font-bold text-cream leading-tight">
							Delete Room Session
						</h3>
						<p class="text-xs text-faint font-mono">Irreversible host action</p>
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

			<!-- Warning sign box -->
			<div class="mt-4 rounded-xl border border-ruby/25 bg-ruby/10 p-3.5">
				<div class="flex items-start gap-2.5">
					<IconAlertTriangle size={16} stroke={2} class="text-ruby shrink-0 mt-0.5" />
					<div class="text-xs text-cream/90 leading-relaxed">
						<p class="font-semibold text-ruby">Warning Sign: Immediate Termination</p>
						<p class="mt-1 text-taupe">
							Deleting <span class="text-cream font-medium">“{room.title || room.room}”</span> will permanently end this room session, clear the shared queue, and immediately disconnect all <span class="text-ruby font-bold">{room.awake.length} awake member{room.awake.length === 1 ? '' : 's'}</span>.
						</p>
					</div>
				</div>
			</div>

			<!-- Double Check Verification Input -->
			<div class="mt-4">
				<label for="confirm-delete-input" class="block text-xs font-mono text-faint mb-1.5">
					To double-check and confirm, please type the room code <span class="text-ruby font-bold font-mono select-all bg-ruby/15 px-1.5 py-0.5 rounded border border-ruby/30">{room.room}</span> below:
				</label>
				<input
					id="confirm-delete-input"
					type="text"
					bind:value={confirmInput}
					placeholder={room.room}
					autocomplete="off"
					class="w-full rounded-lg border border-cream/15 bg-night/80 px-3 py-2 text-xs font-mono text-cream outline-none focus:border-ruby/70 transition-colors placeholder:text-faint/40"
				/>
			</div>

			<!-- Actions -->
			<div class="mt-5 flex items-center justify-end gap-2 border-t border-cream/10 pt-3.5">
				<button
					type="button"
					class="btn btn-ghost btn-sm text-xs px-3.5 text-taupe hover:text-cream"
					onclick={handleClose}
				>
					Cancel
				</button>
				<button
					type="button"
					disabled={!isMatch || isDeleting}
					class="btn btn-sm text-xs px-4 py-2 font-mono flex items-center gap-1.5 transition-all {isMatch
						? 'bg-ruby hover:bg-ruby/90 text-white shadow-lg shadow-ruby/25 font-bold cursor-pointer'
						: 'bg-ruby/15 text-ruby/40 border border-ruby/20 cursor-not-allowed opacity-60'}"
					onclick={handleDelete}
				>
					<IconTrash size={14} stroke={2} />
					<span>{isDeleting ? 'Deleting room...' : 'Yes, Delete Room'}</span>
				</button>
			</div>
		</div>
	</div>
{/if}
