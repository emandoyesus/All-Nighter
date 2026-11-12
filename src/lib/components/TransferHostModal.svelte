<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import type { Peer } from '#lib/room/types';
	import IconCrown from '@tabler/icons-svelte/icons/crown';
	import IconAlertTriangle from '@tabler/icons-svelte/icons/alert-triangle';
	import IconArrowRight from '@tabler/icons-svelte/icons/arrow-right';
	import IconX from '@tabler/icons-svelte/icons/x';

	let open = $state(false);
	let targetPeer = $state<Pick<Peer, 'id' | 'name' | 'avatar'> | null>(null);
	let isTransferring = $state(false);

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

	function handleClose(): void {
		if (isTransferring) return;
		open = false;
	}

	async function handleConfirm(): Promise<void> {
		if (!targetPeer || isTransferring) return;
		isTransferring = true;
		try {
			await room.transferOwnership(targetPeer.id, targetPeer.name);
			open = false;
			window.dispatchEvent(new CustomEvent('an:host-transferred', { detail: targetPeer }));
		} finally {
			isTransferring = false;
		}
	}

	onMount(() => {
		const onOpen = (e: Event) => {
			const detail = (e as CustomEvent<Pick<Peer, 'id' | 'name' | 'avatar'>>).detail;
			if (!detail?.id || !detail?.name) return;
			targetPeer = detail;
			isTransferring = false;
			open = true;
		};

		window.addEventListener('an:open-transfer-host', onOpen);
		return () => {
			window.removeEventListener('an:open-transfer-host', onOpen);
		};
	});
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === 'Escape') handleClose(); }} />

{#if open && targetPeer}
	<div
		use:portal
		class="fixed inset-0 z-[120] flex items-center justify-center bg-night/90 p-4 backdrop-blur-none sm:backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		aria-labelledby="transfer-host-title"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
		onkeydown={(e) => { if (e.key === 'Escape') handleClose(); }}
	>
		<div
			class="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber/30 bg-[#0a1012] p-5 sm:p-6 shadow-2xl text-cream animate-in fade-in zoom-in-95 duration-150"
		>
			<!-- Header -->
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-center gap-2.5">
					<span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber/40 bg-amber/15 text-amber">
						<IconCrown size={19} stroke={1.8} />
					</span>
					<div>
						<h3 id="transfer-host-title" class="text-base sm:text-lg font-semibold text-cream leading-tight">
							Transfer Host Ownership
						</h3>
						<p class="text-xs text-amber font-mono">Pass the crown · Step down as host</p>
					</div>
				</div>
				<button
					type="button"
					class="rounded-lg p-1 text-faint hover:text-cream hover:bg-cream/10 transition-colors cursor-pointer"
					onclick={handleClose}
					disabled={isTransferring}
					aria-label="Close dialog"
				>
					<IconX size={18} stroke={1.5} />
				</button>
			</div>

			<!-- Handoff Visual Card -->
			<div class="mt-4 rounded-xl border border-cream/10 bg-[#060a0b] p-3.5 flex items-center justify-between gap-3">
				<div class="flex flex-1 items-center gap-2.5 min-w-0">
					{#if room.avatar}
						<img
							src={room.avatar}
							alt={room.name || 'You'}
							class="h-8 w-8 shrink-0 rounded-full object-cover border border-amber/40"
						/>
					{:else}
						<span class="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-amber/40 bg-amber/15 text-amber text-xs font-bold font-mono">
							{(room.name || 'H').charAt(0).toUpperCase()}
						</span>
					{/if}
					<div class="min-w-0">
						<p class="truncate text-xs font-medium text-cream">{room.name || 'You'}</p>
						<p class="text-[10px] font-mono text-faint">Current Host</p>
					</div>
				</div>

				<div class="flex shrink-0 items-center justify-center rounded-full border border-amber/30 bg-amber/10 p-1.5 text-amber">
					<IconArrowRight size={14} stroke={2} />
				</div>

				<div class="flex flex-1 items-center gap-2.5 min-w-0 justify-end text-right">
					<div class="min-w-0">
						<p class="truncate text-xs font-semibold text-amber">{targetPeer.name}</p>
						<p class="text-[10px] font-mono text-lamp">New Host</p>
					</div>
					{#if targetPeer.avatar}
						<img
							src={targetPeer.avatar}
							alt={targetPeer.name}
							class="h-8 w-8 shrink-0 rounded-full object-cover border border-amber/50"
						/>
					{:else}
						<span class="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-amber/50 bg-amber/15 text-amber text-xs font-bold font-mono">
							{targetPeer.name.charAt(0).toUpperCase()}
						</span>
					{/if}
				</div>
			</div>

			<!-- Impact Details -->
			<div class="mt-3.5 rounded-xl border border-amber/20 bg-amber/5 p-3.5">
				<div class="flex items-start gap-2.5">
					<IconAlertTriangle size={15} stroke={1.8} class="text-amber shrink-0 mt-0.5" />
					<div class="text-xs leading-relaxed text-taupe">
						<p class="font-medium text-cream">What changes immediately:</p>
						<ul class="mt-1.5 space-y-1 text-[11px] text-taupe list-disc list-inside">
							<li>
								<span class="text-cream font-medium">{targetPeer.name}</span> becomes the room owner with full host &amp; admin permissions.
							</li>
							<li>
								You will step down as host (and can no longer delete or transfer the room).
							</li>
						</ul>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="mt-5 flex items-center justify-end gap-2 border-t border-cream/10 pt-3.5">
				<button
					type="button"
					class="btn btn-ghost btn-sm text-xs px-3.5 text-taupe hover:text-cream cursor-pointer"
					onclick={handleClose}
					disabled={isTransferring}
				>
					Cancel
				</button>
				<button
					type="button"
					disabled={isTransferring}
					class="btn btn-amber btn-sm text-xs px-4 py-2 font-mono flex items-center gap-1.5 font-medium cursor-pointer shadow-md transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
					onclick={handleConfirm}
				>
					<IconCrown size={14} stroke={2} />
					<span>{isTransferring ? 'Transferring...' : 'Transfer Host'}</span>
				</button>
			</div>
		</div>
	</div>
{/if}
