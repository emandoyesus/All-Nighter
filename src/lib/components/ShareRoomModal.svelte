<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import IconShare from '@tabler/icons-svelte/icons/share';
	import IconCopy from '@tabler/icons-svelte/icons/copy';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconKey from '@tabler/icons-svelte/icons/key';
	import IconUsers from '@tabler/icons-svelte/icons/users';
	import IconQrcode from '@tabler/icons-svelte/icons/qrcode';
	import IconDeviceMobile from '@tabler/icons-svelte/icons/device-mobile';
	import IconBrandTelegram from '@tabler/icons-svelte/icons/brand-telegram';
	import IconBrandWhatsapp from '@tabler/icons-svelte/icons/brand-whatsapp';
	import IconBrandX from '@tabler/icons-svelte/icons/brand-x';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let copiedLink = $state(false);
	let copiedKey = $state(false);
	let showQr = $state(false);

	const inviteUrl = $derived(room.inviteUrl(room.room));
	const roomKey = $derived(room.accessKey || room.getSavedKey(room.room));
	const isPrivate = $derived(room.state.isPrivate);

	const hasNativeShare = $derived(typeof navigator !== 'undefined' && typeof navigator.share === 'function');

	async function copyLink() {
		if (!inviteUrl) return;
		try {
			await navigator.clipboard.writeText(inviteUrl);
			copiedLink = true;
			setTimeout(() => (copiedLink = false), 2000);
		} catch {}
	}

	async function copyPasskey() {
		if (!roomKey) return;
		try {
			await navigator.clipboard.writeText(roomKey);
			copiedKey = true;
			setTimeout(() => (copiedKey = false), 2000);
		} catch {}
	}

	async function handleNativeShare() {
		if (!hasNativeShare || !inviteUrl) return;
		try {
			await navigator.share({
				title: `${room.title || room.room} · All Nighter`,
				text: `Join "${room.title || room.room}" on All Nighter — synchronized music, live chat, and all-night focus till dawn.`,
				url: inviteUrl
			});
		} catch {
			// User canceled or failed
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
		}
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

	const shareText = $derived(`Join my room "${room.title || room.room}" on All Nighter:`);
	const telegramShareUrl = $derived(`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareText)}`);
	const whatsappShareUrl = $derived(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + inviteUrl)}`);
	const xShareUrl = $derived(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(inviteUrl)}`);
	const qrCodeUrl = $derived(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inviteUrl)}&color=f4ede2&bgcolor=141c1f&margin=8`);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		use:portal
		class="fixed inset-0 z-[110] flex items-center justify-center bg-night/85 p-3 sm:p-4 backdrop-blur-md overflow-y-auto"
		role="dialog"
		aria-modal="true"
		aria-labelledby="share-room-title"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) open = false;
		}}
	>
		<div
			class="relative w-full max-w-lg my-auto overflow-hidden rounded-2xl border border-cream/15 bg-[#0e1315] p-5 sm:p-6 shadow-2xl text-cream animate-in fade-in zoom-in-95 duration-150"
		>
			<!-- Close Button -->
			<button
				type="button"
				class="absolute top-4 right-4 rounded-lg p-1.5 text-faint hover:text-cream hover:bg-cream/10 transition-colors z-20 cursor-pointer"
				onclick={() => (open = false)}
				aria-label="Close dialog"
			>
				<IconX size={18} stroke={1.5} />
			</button>

			<!-- Header -->
			<div class="flex items-center gap-3 mb-4">
				<div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-lamp/35 bg-lamp/10 text-lamp shadow-sm">
					<IconShare size={20} stroke={1.8} />
				</div>
				<div>
					<h3 id="share-room-title" class="text-base sm:text-lg font-bold tracking-tight text-cream">
						Share Room
					</h3>
					<p class="text-xs text-taupe">
						Invite your crew to listen, chat, and lock in together.
					</p>
				</div>
			</div>

			<!-- Room Summary Card -->
			<div class="mb-4 rounded-xl border border-cream/10 bg-[#141c1f] p-3 flex items-center justify-between gap-2">
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<span class="truncate text-sm font-semibold text-cream">
							{room.title || room.room}
						</span>
						{#if isPrivate}
							<span class="inline-flex items-center gap-1 rounded bg-amber-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300 border border-amber-400/30">
								Private
							</span>
						{:else}
							<span class="inline-flex items-center gap-1 rounded bg-lamp/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-lamp border border-lamp/30">
								Public
							</span>
						{/if}
					</div>
					<p class="mt-0.5 truncate text-[11px] text-taupe">
						{#if room.state.current}
							Now playing: <span class="text-cream/90">{room.state.current.title}</span>
						{:else}
							Open floor · Synchronized music & aux
						{/if}
					</p>
				</div>

				<div class="shrink-0 flex items-center gap-1.5 rounded-full border border-lamp/35 bg-lamp/10 px-2.5 py-1 font-mono text-xs text-lamp">
					<span class="h-1.5 w-1.5 rounded-full bg-lamp animate-pulse"></span>
					<span>{room.awake.length} awake</span>
				</div>
			</div>

			<!-- Copy Invite Link Input & Button -->
			<div class="space-y-1.5 mb-4">
				<label for="room-invite-link" class="block text-xs font-medium text-cream/90">
					Direct Invite Link
				</label>
				<div class="flex items-center gap-2">
					<div class="relative flex-1">
						<input
							id="room-invite-link"
							type="text"
							readonly
							value={inviteUrl}
							class="w-full rounded-lg border border-cream/15 bg-[#141c1f] px-3 py-2 text-xs font-mono text-cream outline-none select-all"
							onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
						/>
					</div>
					<button
						type="button"
						class="btn btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer rounded-lg shadow-sm"
						onclick={copyLink}
					>
						{#if copiedLink}
							<IconCheck size={14} stroke={2} />
							<span>Copied!</span>
						{:else}
							<IconCopy size={14} stroke={1.8} />
							<span>Copy</span>
						{/if}
					</button>
				</div>
			</div>

			<!-- Private Room Passkey Notice -->
			{#if isPrivate}
				<div class="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/8 p-3">
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2 min-w-0">
							<span class="text-amber-300">
								<IconKey size={15} stroke={1.8} />
							</span>
							<div class="text-xs">
								<span class="text-amber-200 font-medium">Room Passkey:</span>
								<code class="ml-1.5 font-mono text-cream bg-[#0e1315] px-2 py-0.5 rounded border border-cream/15">
									{roomKey || 'No passkey set'}
								</code>
							</div>
						</div>
						{#if roomKey}
							<button
								type="button"
								class="btn btn-ghost btn-sm text-[11px] py-1 px-2.5 font-mono text-amber-300 hover:text-cream cursor-pointer"
								onclick={copyPasskey}
							>
								{copiedKey ? '✓ Copied' : 'Copy Key'}
							</button>
						{/if}
					</div>
					<p class="mt-1.5 text-[11px] text-taupe leading-relaxed">
						The invite link above automatically includes this passkey so friends can enter directly without typing it.
					</p>
				</div>
			{/if}

			<!-- Quick 1-Click Share Rows -->
			<div class="space-y-2 mb-4">
				<span class="block text-xs font-medium text-cream/90">Quick Share</span>
				<div class="grid grid-cols-3 gap-2">
					<!-- Telegram -->
					<a
						href={telegramShareUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center justify-center gap-1.5 rounded-lg border border-cream/15 bg-[#141c1f] hover:bg-[#1a2327] hover:border-sky-400/40 py-2 px-2.5 text-xs text-cream transition-all cursor-pointer shadow-sm text-center"
					>
						<IconBrandTelegram size={16} stroke={1.5} class="text-[#24A1DE] shrink-0" />
						<span class="truncate">Telegram</span>
					</a>

					<!-- WhatsApp -->
					<a
						href={whatsappShareUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center justify-center gap-1.5 rounded-lg border border-cream/15 bg-[#141c1f] hover:bg-[#1a2327] hover:border-emerald-400/40 py-2 px-2.5 text-xs text-cream transition-all cursor-pointer shadow-sm text-center"
					>
						<IconBrandWhatsapp size={16} stroke={1.5} class="text-[#25D366] shrink-0" />
						<span class="truncate">WhatsApp</span>
					</a>

					<!-- X / Twitter -->
					<a
						href={xShareUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center justify-center gap-1.5 rounded-lg border border-cream/15 bg-[#141c1f] hover:bg-[#1a2327] hover:border-cream/35 py-2 px-2.5 text-xs text-cream transition-all cursor-pointer shadow-sm text-center"
					>
						<IconBrandX size={15} stroke={1.5} class="text-cream shrink-0" />
						<span class="truncate">Share on X</span>
					</a>
				</div>
			</div>

			<!-- Mobile Native Share Button (if supported) -->
			{#if hasNativeShare}
				<div class="mb-4">
					<button
						type="button"
						class="w-full rounded-lg border border-cream/15 bg-[#141c1f] hover:bg-[#1a2327] hover:border-cream/30 py-2.5 px-3 text-xs font-medium text-cream flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
						onclick={handleNativeShare}
					>
						<IconDeviceMobile size={15} stroke={1.8} class="text-lamp" />
						<span>Share via Device Apps (AirDrop, Messages, etc.)</span>
					</button>
				</div>
			{/if}

			<!-- QR Code Section for In-Person / Mobile Scan -->
			<div class="border-t border-cream/10 pt-3">
				<button
					type="button"
					class="w-full flex items-center justify-between text-xs text-taupe hover:text-cream transition-colors cursor-pointer py-1"
					onclick={() => (showQr = !showQr)}
				>
					<span class="flex items-center gap-1.5 font-medium">
						<IconQrcode size={15} stroke={1.8} class="text-lamp" />
						<span>{showQr ? 'Hide In-Person QR Code' : 'Show In-Person QR Code'}</span>
					</span>
					<span class="text-[11px] font-mono text-lamp">
						{showQr ? 'Close' : 'View QR'}
					</span>
				</button>

				{#if showQr}
					<div class="mt-3 flex flex-col items-center justify-center p-4 rounded-xl border border-cream/10 bg-[#141c1f] text-center animate-in fade-in duration-150">
						<div class="p-2.5 rounded-xl bg-[#141c1f] border border-cream/20 shadow-md mb-2">
							<img
								src={qrCodeUrl}
								alt="Room QR Code"
								class="h-44 w-44 rounded-lg object-contain"
								loading="lazy"
							/>
						</div>
						<p class="text-xs font-medium text-cream">Scan with phone camera</p>
						<p class="text-[11px] text-taupe mt-0.5">Friends nearby can point their camera to join this room instantly.</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
