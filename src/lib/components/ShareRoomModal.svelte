<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import { thumbnailFor } from '#lib/room/youtube';
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
	import IconEye from '@tabler/icons-svelte/icons/eye';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconMessageCircle from '@tabler/icons-svelte/icons/message-circle';
	import IconDownload from '@tabler/icons-svelte/icons/download';
	import IconPhoto from '@tabler/icons-svelte/icons/photo';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let copiedLink = $state(false);
	let copiedKey = $state(false);
	let copiedMessage = $state(false);
	let copiedCardImage = $state(false);
	let isExportingCard = $state(false);
	let activeTab = $state<'preview' | 'share'>('preview');
	let showQr = $state(false);

	const inviteUrl = $derived(room.inviteUrl(room.room));
	const roomKey = $derived(room.accessKey || room.getSavedKey(room.room));
	const isPrivate = $derived(room.state.isPrivate);

	const hasNativeShare = $derived(typeof navigator !== 'undefined' && typeof navigator.share === 'function');

	const currentTrack = $derived(room.state.current);
	const roomTitle = $derived(room.title || room.room || 'The Room');

	const formattedInviteMessage = $derived(
		`🎧 Join me in "${roomTitle}" on All Nighter!\n` +
		(currentTrack ? `🎵 Now playing: ${currentTrack.title} (${currentTrack.channel ?? 'YouTube'})\n` : '🎶 Open floor with synchronized YouTube aux\n') +
		`👥 ${room.awake.length} awake right now\n` +
		(isPrivate && roomKey ? `🔑 Passkey: ${roomKey}\n` : '') +
		`🔗 ${inviteUrl}`
	);

	async function generateCardCanvas(): Promise<HTMLCanvasElement> {
		const canvas = document.createElement('canvas');
		canvas.width = 1000;
		canvas.height = 540;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Canvas not supported');

		// Background dark card
		ctx.fillStyle = '#0a0f12';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Decorative subtle border
		ctx.strokeStyle = '#1d272b';
		ctx.lineWidth = 4;
		ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

		// Accent bar at top
		ctx.fillStyle = '#e5a93c';
		ctx.fillRect(14, 14, canvas.width - 28, 6);

		// Brand header
		ctx.fillStyle = '#e5a93c';
		ctx.font = 'bold 20px monospace';
		ctx.fillText('ALL NIGHTER · LIVE AUX', 48, 65);

		ctx.fillStyle = '#788986';
		ctx.font = '15px monospace';
		ctx.fillText('all-nighter.pro.et', 48, 92);

		// Thumbnail / artwork on left
		const thumbX = 48;
		const thumbY = 120;
		const thumbW = 340;
		const thumbH = 210;

		let thumbDrawn = false;
		if (currentTrack?.videoId) {
			try {
				const img = new Image();
				img.crossOrigin = 'anonymous';
				await new Promise((resolve) => {
					img.onload = resolve;
					img.onerror = resolve;
					setTimeout(resolve, 1500);
					img.src = `https://img.youtube.com/vi/${currentTrack.videoId}/hqdefault.jpg`;
				});
				if (img.complete && img.naturalWidth > 0) {
					ctx.save();
					ctx.beginPath();
					if (typeof ctx.roundRect === 'function') {
						ctx.roundRect(thumbX, thumbY, thumbW, thumbH, 12);
					} else {
						ctx.rect(thumbX, thumbY, thumbW, thumbH);
					}
					ctx.clip();
					ctx.drawImage(img, thumbX, thumbY, thumbW, thumbH);
					ctx.restore();
					thumbDrawn = true;
				}
			} catch {}
		}

		if (!thumbDrawn) {
			ctx.fillStyle = '#141c1f';
			ctx.beginPath();
			if (typeof ctx.roundRect === 'function') {
				ctx.roundRect(thumbX, thumbY, thumbW, thumbH, 12);
			} else {
				ctx.rect(thumbX, thumbY, thumbW, thumbH);
			}
			ctx.fill();
			ctx.strokeStyle = '#26373d';
			ctx.lineWidth = 2;
			ctx.stroke();

			ctx.fillStyle = '#e5a93c';
			ctx.font = 'bold 24px monospace';
			ctx.textAlign = 'center';
			ctx.fillText('🎧 LIVE AUX', thumbX + thumbW / 2, thumbY + thumbH / 2 - 10);
			ctx.fillStyle = '#8e9e9a';
			ctx.font = '15px sans-serif';
			ctx.fillText('Synchronized Floor', thumbX + thumbW / 2, thumbY + thumbH / 2 + 20);
			ctx.textAlign = 'start';
		}

		// Text block on right
		const textX = 420;
		// Room title
		ctx.fillStyle = '#f4ede2';
		ctx.font = 'bold 32px sans-serif';
		const safeTitle = roomTitle.length > 25 ? roomTitle.slice(0, 24) + '…' : roomTitle;
		ctx.fillText(safeTitle, textX, 155);

		// Public/Private badge
		ctx.fillStyle = isPrivate ? '#f59e0b' : '#34d399';
		ctx.font = 'bold 13px monospace';
		ctx.fillText(isPrivate ? '[PRIVATE ROOM]' : '[PUBLIC ROOM]', textX, 185);

		// Now playing
		ctx.fillStyle = '#e5a93c';
		ctx.font = 'bold 18px monospace';
		const songTitle = currentTrack
			? `🎵 ${currentTrack.title.slice(0, 32)}${currentTrack.title.length > 32 ? '…' : ''}`
			: '🎵 Open Aux · Community DJ Queue';
		ctx.fillText(songTitle, textX, 225);

		if (currentTrack?.channel) {
			ctx.fillStyle = '#7a8e8b';
			ctx.font = '15px sans-serif';
			ctx.fillText(`by ${currentTrack.channel}`, textX, 252);
		}

		// Awake count
		ctx.fillStyle = '#26de81';
		ctx.beginPath();
		ctx.arc(textX + 6, 296, 6, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#f4ede2';
		ctx.font = 'bold 17px monospace';
		ctx.fillText(`${room.awake.length} member${room.awake.length === 1 ? '' : 's'} awake now`, textX + 22, 302);

		if (isPrivate && roomKey) {
			ctx.fillStyle = '#f59e0b';
			ctx.font = '15px monospace';
			ctx.fillText(`🔑 Room Passkey: ${roomKey}`, textX, 335);
		}

		// Bottom Join Pill
		ctx.fillStyle = '#141c1f';
		ctx.beginPath();
		if (typeof ctx.roundRect === 'function') {
			ctx.roundRect(48, 360, canvas.width - 96, 65, 10);
		} else {
			ctx.rect(48, 360, canvas.width - 96, 65);
		}
		ctx.fill();
		ctx.strokeStyle = '#2d3e45';
		ctx.lineWidth = 1.5;
		ctx.stroke();

		ctx.fillStyle = '#f4ede2';
		ctx.font = 'bold 16px monospace';
		ctx.fillText('JOIN SESSION:', 70, 400);

		ctx.fillStyle = '#e5a93c';
		ctx.font = '15px monospace';
		const shortUrl = inviteUrl.length > 60 ? inviteUrl.slice(0, 58) + '…' : inviteUrl;
		ctx.fillText(shortUrl, 210, 400);

		// Bottom tagline
		ctx.fillStyle = '#596966';
		ctx.font = '13px monospace';
		ctx.fillText('All Nighter · Show up. Lock in till sunrise.', 48, 490);

		return canvas;
	}

	async function downloadCardImage() {
		if (isExportingCard) return;
		isExportingCard = true;
		try {
			const canvas = await generateCardCanvas();
			const link = document.createElement('a');
			link.download = `${roomTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-invite.png`;
			link.href = canvas.toDataURL('image/png');
			link.click();
		} catch {} finally {
			isExportingCard = false;
		}
	}

	async function copyCardImage() {
		if (isExportingCard) return;
		isExportingCard = true;
		try {
			const canvas = await generateCardCanvas();
			canvas.toBlob(async (blob) => {
				if (!blob) return;
				try {
					if (typeof ClipboardItem !== 'undefined') {
						await navigator.clipboard.write([
							new ClipboardItem({ 'image/png': blob })
						]);
						copiedCardImage = true;
						setTimeout(() => (copiedCardImage = false), 2000);
					} else {
						await downloadCardImage();
					}
				} catch {
					await downloadCardImage();
				} finally {
					isExportingCard = false;
				}
			}, 'image/png');
		} catch {
			isExportingCard = false;
		}
	}

	async function copyLink() {
		if (!inviteUrl) return;
		try {
			await navigator.clipboard.writeText(inviteUrl);
			copiedLink = true;
			setTimeout(() => (copiedLink = false), 2000);
		} catch {}
	}

	async function copyFormattedMessage() {
		try {
			await navigator.clipboard.writeText(formattedInviteMessage);
			copiedMessage = true;
			setTimeout(() => (copiedMessage = false), 2000);
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
				title: `${roomTitle} · All Nighter`,
				text: formattedInviteMessage,
				url: inviteUrl
			});
		} catch {
			// User canceled
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

	const telegramShareUrl = $derived(
		`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(formattedInviteMessage)}`
	);
	const whatsappShareUrl = $derived(
		`https://api.whatsapp.com/send?text=${encodeURIComponent(formattedInviteMessage)}`
	);
	const xShareUrl = $derived(
		`https://twitter.com/intent/tweet?text=${encodeURIComponent(formattedInviteMessage)}`
	);
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
			class="relative w-full max-w-lg my-auto max-h-[92vh] overflow-y-auto rounded-2xl border border-cream/15 bg-[#0e1315] p-5 sm:p-6 shadow-2xl text-cream animate-in fade-in zoom-in-95 duration-150 custom-scrollbar"
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

			<!-- Tab Navigation Switcher -->
			<div class="grid grid-cols-2 rounded-xl bg-[#141c1f] p-1 border border-cream/10 text-xs font-medium mb-4">
				<button
					type="button"
					class="rounded-lg py-2 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 {activeTab === 'preview' ? 'bg-[#1d262a] text-cream shadow-sm font-semibold' : 'text-taupe hover:text-cream'}"
					onclick={() => (activeTab = 'preview')}
				>
					<IconEye size={14} stroke={1.8} class={activeTab === 'preview' ? 'text-lamp' : ''} />
					<span>Invite Preview</span>
				</button>
				<button
					type="button"
					class="rounded-lg py-2 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 {activeTab === 'share' ? 'bg-[#1d262a] text-cream shadow-sm font-semibold' : 'text-taupe hover:text-cream'}"
					onclick={() => (activeTab = 'share')}
				>
					<IconShare size={14} stroke={1.8} class={activeTab === 'share' ? 'text-lamp' : ''} />
					<span>Quick Links & QR</span>
				</button>
			</div>

			{#if activeTab === 'preview'}
				<!-- LIVE SOCIAL CARD PREVIEW -->
				<div class="mb-4 rounded-xl border border-cream/15 bg-[#141c1f] overflow-hidden shadow-lg animate-in fade-in duration-150">
					<div class="px-3.5 py-2 border-b border-cream/10 bg-[#0c1113] flex items-center justify-between">
						<span class="text-[11px] font-mono text-faint uppercase tracking-wider flex items-center gap-1.5">
							<span class="h-1.5 w-1.5 rounded-full bg-lamp animate-pulse"></span>
							<span>Live Card Preview (What Friends See)</span>
						</span>
						<span class="text-[10px] font-mono text-lamp font-semibold">Rich Embed</span>
					</div>

					<!-- Visual Rich Card -->
					<div class="p-3.5 space-y-3">
						<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
							<!-- Artwork / Thumbnail -->
							<div class="relative h-24 w-full sm:w-36 shrink-0 rounded-lg overflow-hidden border border-cream/15 bg-night-3 flex items-center justify-center">
								{#if currentTrack?.videoId}
									<img
										src={thumbnailFor(currentTrack.videoId)}
										alt={currentTrack.title}
										class="h-full w-full object-cover"
									/>
									<span class="absolute bottom-1 right-1 rounded bg-night/85 px-1.5 py-0.5 font-mono text-[9px] text-lamp border border-lamp/30 flex items-center gap-1">
										<span class="h-1 w-1 rounded-full bg-lamp animate-pulse"></span>
										PLAYING
									</span>
								{:else}
									<div class="flex flex-col items-center justify-center text-center p-2 text-taupe">
										<IconMusic size={22} class="text-lamp mb-1" />
										<span class="text-[9px] font-mono tracking-wider">ALL NIGHTER</span>
									</div>
								{/if}
							</div>

							<!-- Room details in preview -->
							<div class="min-w-0 flex-1 space-y-1">
								<div class="flex items-center gap-1.5 flex-wrap">
									<span class="text-[10px] font-mono text-lamp uppercase font-semibold">all-nighter.pro.et</span>
									<span class="text-faint/40">·</span>
									{#if isPrivate}
										<span class="rounded bg-amber-400/10 px-1 py-0.2 font-mono text-[9px] text-amber-300 border border-amber-400/30">
											Private
										</span>
									{:else}
										<span class="rounded bg-lamp/10 px-1 py-0.2 font-mono text-[9px] text-lamp border border-lamp/30">
											Public
										</span>
									{/if}
								</div>

								<h4 class="text-sm sm:text-base font-bold text-cream leading-tight truncate">
									{roomTitle}
								</h4>

								<p class="text-xs text-taupe leading-relaxed line-clamp-2">
									{#if currentTrack}
										🎵 Now playing: <strong class="text-cream font-medium">{currentTrack.title}</strong>
										{#if currentTrack.channel}
											<span class="text-faint">({currentTrack.channel})</span>
										{/if}
									{:else}
										Synchronized YouTube music, focus timer & open community aux.
									{/if}
								</p>

								<!-- Awake avatars in preview card -->
								<div class="pt-1 flex items-center gap-2">
									<div class="flex -space-x-1.5 overflow-hidden">
										{#each room.awake.slice(0, 4) as peer}
											{#if peer.avatar}
												<img src={peer.avatar} alt={peer.name} class="inline-block h-5 w-5 rounded-full ring-2 ring-[#141c1f] object-cover" />
											{:else}
												<div class="inline-grid h-5 w-5 place-items-center rounded-full bg-lamp/20 ring-2 ring-[#141c1f] text-[9px] font-bold text-lamp">
													{peer.name.charAt(0).toUpperCase()}
												</div>
											{/if}
										{/each}
									</div>
									<span class="text-[11px] font-mono text-faint">
										{room.awake.length} awake right now
									</span>
								</div>
							</div>
						</div>

						<!-- Formatted Text Snippet Preview Box -->
						<div class="rounded-lg bg-[#0e1315] border border-cream/10 p-2.5">
							<p class="text-[10px] font-mono text-faint mb-1">Pre-composed invite message:</p>
							<p class="text-xs font-mono text-cream/90 whitespace-pre-line leading-relaxed select-all">
								{formattedInviteMessage}
							</p>
						</div>
					</div>
				</div>

				<!-- Action to Copy Full Formatted Message and Graphic Card -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
					<button
						type="button"
						class="btn btn-primary py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer rounded-lg shadow-sm"
						onclick={copyCardImage}
						disabled={isExportingCard}
						title="Copy card image to clipboard to paste directly into Telegram"
					>
						{#if copiedCardImage}
							<IconCheck size={14} stroke={2} />
							<span>Card Copied!</span>
						{:else}
							<IconPhoto size={14} stroke={1.8} />
							<span>{isExportingCard ? 'Rendering...' : 'Copy Card Image'}</span>
						{/if}
					</button>

					<button
						type="button"
						class="btn btn-secondary py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer rounded-lg shadow-sm"
						onclick={copyFormattedMessage}
					>
						{#if copiedMessage}
							<IconCheck size={14} stroke={2} />
							<span>Text Copied!</span>
						{:else}
							<IconMessageCircle size={14} stroke={1.8} />
							<span>Copy Text</span>
						{/if}
					</button>

					<button
						type="button"
						class="btn btn-ghost border border-cream/15 hover:border-lamp/40 py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer rounded-lg shadow-sm text-cream"
						onclick={downloadCardImage}
						disabled={isExportingCard}
					>
						<IconDownload size={14} stroke={1.8} />
						<span>Download PNG</span>
					</button>
				</div>
			{/if}

			{#if activeTab === 'share' || activeTab === 'preview'}
				<!-- Copy Direct URL Field -->
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
								class="w-full rounded-lg border border-cream/15 bg-[#141c1f] px-3 py-2 text-xs font-mono text-cream outline-none select-all focus:border-lamp"
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

				<!-- Private Passkey Notification -->
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

				<!-- 1-Click Social Sharing Options -->
				<div class="space-y-2 mb-4">
					<span class="block text-xs font-medium text-cream/90">Share to Messengers</span>
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

				<!-- In-Person QR Code -->
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
			{/if}
		</div>
	</div>
{/if}
