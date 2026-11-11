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
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconArrowRight from '@tabler/icons-svelte/icons/arrow-right';
	import IconSparkles from '@tabler/icons-svelte/icons/sparkles';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let tab = $state<'preview' | 'link'>('preview');
	let copiedLink = $state(false);
	let copiedFormatted = $state(false);
	let copiedKey = $state(false);

	const inviteUrl = $derived(room.inviteUrl(room.room));
	const roomKey = $derived(room.accessKey || room.getSavedKey(room.room));
	const isPrivate = $derived(room.state.isPrivate);

	const hasNativeShare = $derived(typeof navigator !== 'undefined' && typeof navigator.share === 'function');

	const formattedInviteText = $derived(
`🌙 Join my room on All Nighter!
"${room.title || room.room}"

🎧 Synchronized beats & shared aux
👥 ${room.awake.length} awake right now
🌅 Focus lock-in till sunrise

Lock in here:
${inviteUrl}`
	);

	async function copyLink() {
		if (!inviteUrl) return;
		try {
			await navigator.clipboard.writeText(inviteUrl);
			copiedLink = true;
			setTimeout(() => (copiedLink = false), 2000);
		} catch {}
	}

	async function copyFormattedInvite() {
		try {
			await navigator.clipboard.writeText(formattedInviteText);
			copiedFormatted = true;
			setTimeout(() => (copiedFormatted = false), 2000);
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
			<div class="flex items-center gap-3 mb-3.5">
				<div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-lamp/35 bg-lamp/10 text-lamp shadow-sm">
					<IconShare size={20} stroke={1.8} />
				</div>
				<div>
					<h3 id="share-room-title" class="text-base sm:text-lg font-bold tracking-tight text-cream">
						Share Room
					</h3>
					<p class="text-xs text-taupe">
						Invite your friends to focus, chat, and listen together.
					</p>
				</div>
			</div>

			<!-- Clean Segmented Mode Switcher: Duolingo-style Preview vs Direct Link -->
			<div class="grid grid-cols-2 rounded-xl bg-[#141c1f] p-1 border border-cream/10 text-xs font-medium mb-4">
				<button
					type="button"
					class="rounded-lg py-1.5 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 {tab === 'preview' ? 'bg-[#1e272b] text-cream shadow-sm font-semibold text-lamp' : 'text-taupe hover:text-cream'}"
					onclick={() => (tab = 'preview')}
				>
					<IconSparkles size={13} stroke={2} />
					<span>Invite Pass Preview</span>
				</button>
				<button
					type="button"
					class="rounded-lg py-1.5 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 {tab === 'link' ? 'bg-[#1e272b] text-cream shadow-sm font-semibold text-lamp' : 'text-taupe hover:text-cream'}"
					onclick={() => (tab = 'link')}
				>
					<IconQrcode size={13} stroke={2} />
					<span>Direct Link & QR</span>
				</button>
			</div>

			{#if tab === 'preview'}
				<!-- DUOLINGO-STYLE TACTILE ROOM PASS / PREVIEW CARD -->
				<div class="space-y-4">
					<div class="relative overflow-hidden rounded-2xl border-2 border-lamp/35 bg-gradient-to-b from-[#131b1e] to-[#0a0f11] p-4 sm:p-5 shadow-2xl text-cream">
						<!-- Ambient radial glow behind card -->
						<div class="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-lamp/15 blur-2xl"></div>
						<div class="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl"></div>

						<!-- Top Brand Pill -->
						<div class="relative z-10 flex items-center justify-between gap-2 mb-3">
							<div class="inline-flex items-center gap-1.5 rounded-full border border-lamp/40 bg-lamp/15 px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase text-lamp shadow-sm">
								<IconMoon size={12} stroke={2.5} />
								<span>ALL NIGHTER LOCK-IN</span>
							</div>
							<span class="inline-flex items-center gap-1 rounded-full bg-cream/10 px-2 py-0.5 text-[10px] font-mono text-cream/70 border border-cream/10">
								{isPrivate ? '🔒 Private Room' : '🌐 Open Aux Floor'}
							</span>
						</div>

						<!-- Headline / Host invitation -->
						<div class="relative z-10 mb-3">
							<p class="text-[11px] font-mono uppercase tracking-wider text-taupe">
								{room.name || 'Host'} is locking in till sunrise
							</p>
							<h4 class="text-lg sm:text-xl font-bold tracking-tight text-cream mt-0.5 leading-tight">
								“{room.title || room.room}”
							</h4>
							<p class="text-xs text-taupe/90 mt-1 leading-relaxed">
								Synchronized music, live chat, and shared focus till dawn.
							</p>
						</div>

						<!-- Active Awake Cluster & Audio Waveform -->
						<div class="relative z-10 my-3 rounded-xl border border-cream/10 bg-[#060a0b]/80 p-3 flex items-center justify-between gap-3 shadow-inner">
							<!-- Overlapping Awake Avatar Stack -->
							<div class="flex items-center gap-2.5 min-w-0">
								<div class="flex -space-x-2 shrink-0">
									{#each room.awake.slice(0, 4) as peer (peer.id)}
										{#if peer.avatar}
											<img
												src={peer.avatar}
												alt={peer.name}
												class="h-7 w-7 rounded-full border-2 border-[#131b1e] object-cover bg-night shadow-sm"
											/>
										{:else}
											<span class="grid h-7 w-7 place-items-center rounded-full border-2 border-[#131b1e] bg-lamp/20 text-lamp font-bold text-[10px]">
												{peer.name.charAt(0).toUpperCase()}
											</span>
										{/if}
									{/each}
									{#if room.awake.length > 4}
										<span class="grid h-7 w-7 place-items-center rounded-full border-2 border-[#131b1e] bg-night-3 text-[10px] font-bold text-cream">
											+{room.awake.length - 4}
										</span>
									{/if}
								</div>
								<div class="min-w-0">
									<p class="text-xs font-semibold text-cream truncate">
										{room.awake.length} {room.awake.length === 1 ? 'member' : 'members'} awake
									</p>
									<p class="text-[10px] text-lamp font-mono flex items-center gap-1">
										<span class="h-1.5 w-1.5 rounded-full bg-lamp animate-pulse"></span>
										Floor Live Right Now
									</p>
								</div>
							</div>

							<!-- Animated Audio Equalizer Waveform -->
							<div class="flex items-center gap-1 shrink-0 px-2 py-1.5 rounded-lg bg-cream/5 border border-cream/10" title="Synchronized live aux">
								<span class="h-2 w-1 rounded-full bg-lamp animate-bounce" style="animation-delay: 0ms;"></span>
								<span class="h-4 w-1 rounded-full bg-lamp animate-bounce" style="animation-delay: 150ms;"></span>
								<span class="h-3 w-1 rounded-full bg-lamp animate-bounce" style="animation-delay: 300ms;"></span>
								<span class="h-5 w-1 rounded-full bg-lamp animate-bounce" style="animation-delay: 100ms;"></span>
								<span class="h-2 w-1 rounded-full bg-lamp animate-bounce" style="animation-delay: 250ms;"></span>
							</div>
						</div>

						<!-- Now Playing Music Strip -->
						{#if room.state.current}
							<div class="relative z-10 mb-3 flex items-center gap-2 rounded-lg bg-cream/5 border border-cream/10 px-2.5 py-1.5 text-xs">
								<span class="text-lamp">🎵</span>
								<span class="truncate text-cream/90 font-medium">
									{room.state.current.title}
								</span>
								{#if room.state.current.channel}
									<span class="shrink-0 text-[10px] font-mono text-faint uppercase">
										· {room.state.current.channel}
									</span>
								{/if}
							</div>
						{/if}

						<!-- Duolingo-Style Chunky Action Bar -->
						<div class="relative z-10 pt-2 flex items-center justify-between gap-3 border-t border-cream/10">
							<span class="text-[11px] font-mono text-taupe truncate">
								all-nighter.pro.et
							</span>
							<div class="inline-flex items-center gap-1.5 rounded-xl bg-lamp px-3.5 py-1.5 text-xs font-bold font-mono uppercase tracking-wider text-night shadow-lg">
								<span>ENTER ROOM</span>
								<IconArrowRight size={13} stroke={2.5} />
							</div>
						</div>
					</div>

					<!-- Primary Share Actions for the Pass -->
					<div class="space-y-2">
						<div class="grid grid-cols-2 gap-2">
							<button
								type="button"
								class="btn btn-primary py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-lg shadow-sm cursor-pointer"
								onclick={copyFormattedInvite}
							>
								{#if copiedFormatted}
									<IconCheck size={14} stroke={2} />
									<span>Invite Copied!</span>
								{:else}
									<IconCopy size={14} stroke={1.8} />
									<span>Copy Invite Card</span>
								{/if}
							</button>

							<button
								type="button"
								class="btn btn-secondary py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-lg border border-cream/15 hover:border-cream/30 text-cream cursor-pointer"
								onclick={copyLink}
							>
								{#if copiedLink}
									<IconCheck size={14} stroke={2} class="text-lamp" />
									<span>Link Copied!</span>
								{:else}
									<IconCopy size={14} stroke={1.8} />
									<span>Copy Link Only</span>
								{/if}
							</button>
						</div>

						<!-- Social Quick Row -->
						<div class="grid grid-cols-3 gap-2 pt-1">
							<a
								href={telegramShareUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center justify-center gap-1.5 rounded-lg border border-cream/15 bg-[#141c1f] hover:bg-[#1a2327] hover:border-sky-400/40 py-2 px-2.5 text-xs text-cream transition-all cursor-pointer shadow-sm text-center"
							>
								<IconBrandTelegram size={15} stroke={1.5} class="text-[#24A1DE] shrink-0" />
								<span class="truncate">Telegram</span>
							</a>

							<a
								href={whatsappShareUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center justify-center gap-1.5 rounded-lg border border-cream/15 bg-[#141c1f] hover:bg-[#1a2327] hover:border-emerald-400/40 py-2 px-2.5 text-xs text-cream transition-all cursor-pointer shadow-sm text-center"
							>
								<IconBrandWhatsapp size={15} stroke={1.5} class="text-[#25D366] shrink-0" />
								<span class="truncate">WhatsApp</span>
							</a>

							<a
								href={xShareUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center justify-center gap-1.5 rounded-lg border border-cream/15 bg-[#141c1f] hover:bg-[#1a2327] hover:border-cream/35 py-2 px-2.5 text-xs text-cream transition-all cursor-pointer shadow-sm text-center"
							>
								<IconBrandX size={14} stroke={1.5} class="text-cream shrink-0" />
								<span class="truncate">Share on X</span>
							</a>
						</div>
					</div>
				</div>
			{:else}
				<!-- DIRECT LINK & IN-PERSON QR TAB -->
				<div class="space-y-4">
					<!-- Copy Direct Invite Link -->
					<div class="space-y-1.5">
						<label for="room-invite-link" class="block text-xs font-medium text-cream/90">
							Direct Room Link
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
						<div class="rounded-xl border border-amber-400/25 bg-amber-400/8 p-3">
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
								The invite link automatically embeds this passkey so invited friends bypass password entry.
							</p>
						</div>
					{/if}

					<!-- In-Person QR Code -->
					<div class="flex flex-col items-center justify-center p-4 rounded-xl border border-cream/10 bg-[#141c1f] text-center">
						<div class="p-2.5 rounded-xl bg-[#141c1f] border border-cream/20 shadow-md mb-2">
							<img
								src={qrCodeUrl}
								alt="Room QR Code"
								class="h-40 w-40 rounded-lg object-contain"
								loading="lazy"
							/>
						</div>
						<p class="text-xs font-semibold text-cream">Scan with phone camera</p>
						<p class="text-[11px] text-taupe mt-0.5">Friends nearby can point their camera to jump into the room instantly.</p>
					</div>

					<!-- Mobile Native Share Button (if supported) -->
					{#if hasNativeShare}
						<div>
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
				</div>
			{/if}
		</div>
	</div>
{/if}
