<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import IconAlertTriangle from '@tabler/icons-svelte/icons/alert-triangle';
	import IconPlayerPause from '@tabler/icons-svelte/icons/player-pause';
	import IconPlayerPlay from '@tabler/icons-svelte/icons/player-play';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconUsers from '@tabler/icons-svelte/icons/users';

	let open = $state(false);

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

	onMount(() => {
		const onOpen = () => {
			if (room.canControlPlayback) {
				open = true;
			}
		};
		window.addEventListener('an:open-global-pause-modal', onOpen);
		return () => {
			window.removeEventListener('an:open-global-pause-modal', onOpen);
		};
	});

	function handleConfirm(): void {
		open = false;
		window.dispatchEvent(new CustomEvent('an:player:toggle'));
	}

	function handleClose(): void {
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
		aria-labelledby="global-pause-title"
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
						{#if room.state.playing}
							<IconAlertTriangle size={19} stroke={1.8} />
						{:else}
							<IconPlayerPlay size={19} stroke={1.8} />
						{/if}
					</span>
					<div>
						<h3 id="global-pause-title" class="text-base sm:text-lg font-semibold text-cream leading-tight">
							{room.state.playing ? 'Pause Room Playback?' : 'Resume Room Playback?'}
						</h3>
						<p class="text-xs text-amber font-mono">Global admin action</p>
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

			<!-- Warning Box -->
			<div class="mt-4 rounded-xl border border-amber/25 bg-amber/10 p-3.5">
				<div class="flex items-start gap-2.5">
					<IconUsers size={16} stroke={2} class="text-amber shrink-0 mt-0.5" />
					<div class="text-xs leading-relaxed text-cream/90">
						{#if room.state.playing}
							<p class="font-semibold text-amber">This affects all room listeners</p>
							<p class="mt-1 text-taupe">
								Pausing here will immediately stop music playback for <span class="text-cream font-medium">all {room.awake.length} member{room.awake.length === 1 ? '' : 's'}</span> currently in <span class="text-cream font-medium">“{room.title || room.room}”</span>.
							</p>
							<p class="mt-1.5 text-taupe/80 text-[11px]">
								Tip: To silence music just for yourself, use the local Mute button instead.
							</p>
						{:else}
							<p class="font-semibold text-amber">Resume playback for everyone</p>
							<p class="mt-1 text-taupe">
								Resuming will start playing <span class="text-cream font-medium">“{room.state.current?.title ?? 'the current track'}”</span> synchronously for all members in the room.
							</p>
						{/if}
					</div>
				</div>
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
					class="btn btn-amber btn-sm text-xs px-4 py-2 font-mono flex items-center gap-1.5 font-medium cursor-pointer shadow-md transition-all hover:scale-[1.02]"
					onclick={handleConfirm}
				>
					{#if room.state.playing}
						<IconPlayerPause size={14} stroke={2} />
						<span>Pause for Everyone</span>
					{:else}
						<IconPlayerPlay size={14} stroke={2} />
						<span>Resume for Everyone</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
