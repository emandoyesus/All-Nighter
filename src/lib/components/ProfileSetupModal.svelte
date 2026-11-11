<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, extractGoogleFirstName } from '#lib/auth.svelte';
	import { room } from '#lib/room/room.svelte';
	import { NOCTURNAL_AVATARS, DEFAULT_AVATAR } from '#lib/avatars';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconDice from '@tabler/icons-svelte/icons/dice';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconBrandGoogle from '@tabler/icons-svelte/icons/brand-google';
	import IconSparkles from '@tabler/icons-svelte/icons/sparkles';
	import IconArrowRight from '@tabler/icons-svelte/icons/arrow-right';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let callsign = $state('');
	let avatarType = $state<'google' | 'avatar'>('avatar');
	let selectedAvatarUrl = $state(DEFAULT_AVATAR);
	let saving = $state(false);
	let errorMessage = $state('');

	const googlePhoto = $derived.by(() => {
		if (!auth.user) return null;
		return (
			auth.user.user_metadata?.picture ||
			auth.user.user_metadata?.avatar_url ||
			null
		);
	});

	const isGoogleUser = $derived.by(() => {
		if (!auth.user) return false;
		return (
			auth.user.app_metadata?.provider === 'google' ||
			auth.user.identities?.some((id) => id.provider === 'google') ||
			Boolean(auth.user.user_metadata?.iss?.includes('accounts.google.com'))
		);
	});

	const currentEffectiveAvatar = $derived(
		avatarType === 'google' && googlePhoto ? googlePhoto : selectedAvatarUrl
	);

	const RANDOM_CALLSIGNS = [
		'midnight-coder',
		'cyber-runner',
		'dawn-chaser',
		'analog-ghost',
		'neon-pilot',
		'night-owl',
		'tape-rewind',
		'pixel-drifter',
		'synth-operator',
		'moon-walker',
		'stellar-pulse',
		'terminal-sage',
		'quiet-storm',
		'orbit-surfer',
		'dark-mode',
		'echo-coder',
		'sub-zero',
		'astral-dev',
		'dawn-walker'
	];

	function syncFromProfile() {
		errorMessage = '';
		if (auth.user) {
			const googleFirst = extractGoogleFirstName(auth.user.user_metadata, auth.user.email);
			const existingCallsign =
				auth.user.user_metadata?.callsign ||
				googleFirst ||
				auth.user.email?.split('@')[0] ||
				room.name ||
				'night-owl';
			callsign = existingCallsign;

			const currentAvatar = auth.user.user_metadata?.avatar_url || room.avatar;
			if (googlePhoto && currentAvatar === googlePhoto) {
				avatarType = 'google';
			} else {
				avatarType = 'avatar';
				if (currentAvatar && currentAvatar.startsWith('/avatars/')) {
					selectedAvatarUrl = currentAvatar;
				} else {
					selectedAvatarUrl = DEFAULT_AVATAR;
				}
			}
		} else {
			callsign = room.name || 'night-owl';
			selectedAvatarUrl = room.avatar || DEFAULT_AVATAR;
			avatarType = 'avatar';
		}
	}

	onMount(() => {
		const handleOpen = () => {
			syncFromProfile();
			open = true;
		};

		window.addEventListener('an:open-profile-setup', handleOpen);
		return () => {
			window.removeEventListener('an:open-profile-setup', handleOpen);
		};
	});

	$effect(() => {
		if (open) {
			syncFromProfile();
		}
	});

	function handleRandomCallsign() {
		const pool = RANDOM_CALLSIGNS.filter((c) => c !== callsign);
		callsign = pool[Math.floor(Math.random() * pool.length)];
	}

	async function handleSave() {
		const cleanName = callsign.trim().slice(0, 24);
		if (!cleanName || cleanName.length < 2) {
			errorMessage = 'Display name must be at least 2 characters.';
			return;
		}

		saving = true;
		errorMessage = '';

		try {
			const finalAvatar = currentEffectiveAvatar;

			// Save to local room state
			room.setName(cleanName);
			room.setAvatar(finalAvatar);

			try {
				localStorage.setItem('an.callsign', cleanName);
				localStorage.setItem('an.avatar', finalAvatar);
				if (auth.user) {
					localStorage.setItem('an.profile_configured', auth.user.id);
				}
			} catch {}

			// Persist to Supabase if signed in
			if (auth.isCloudUser) {
				await auth.updateProfile({
					callsign: cleanName,
					avatarUrl: finalAvatar,
					profileConfigured: true
				});
			}

			window.dispatchEvent(new CustomEvent('an:profile-updated'));
			open = false;
		} catch (err: any) {
			errorMessage = err?.message || 'Could not save profile setup. Please try again.';
		} finally {
			saving = false;
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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		use:portal
		class="fixed inset-0 z-[130] flex items-center justify-center bg-night/90 p-3 sm:p-4 backdrop-blur-md overflow-y-auto"
		role="dialog"
		aria-modal="true"
		aria-labelledby="profile-setup-title"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) open = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') open = false;
		}}
	>
		<div
			class="relative w-full max-w-[500px] my-auto overflow-hidden rounded-2xl border border-cream/15 bg-[#0b1012] p-5 sm:p-7 shadow-2xl text-cream animate-in fade-in zoom-in-95 duration-150"
		>
			<!-- Close Button -->
			<button
				type="button"
				class="absolute right-4 top-4 rounded-lg p-1 text-faint hover:text-cream hover:bg-cream/10 transition-colors"
				onclick={() => (open = false)}
				aria-label="Close dialog"
			>
				<IconX size={18} stroke={1.5} />
			</button>

			<!-- Header -->
			<div class="flex items-center gap-3">
				<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-lamp/30 bg-lamp/10 text-lamp">
					<IconMoon size={20} stroke={1.8} />
				</span>
				<div>
					<h2 id="profile-setup-title" class="text-base sm:text-lg font-semibold text-cream leading-tight">
						Choose Your Night Profile
					</h2>
					<p class="text-xs text-taupe mt-0.5">
						Set your display name and choose how your avatar appears in rooms and chat.
					</p>
				</div>
			</div>

			<!-- Live Preview Pill -->
			<div class="mt-4 flex items-center gap-3 rounded-xl border border-cream/10 bg-night/80 p-3 shadow-inner">
				<div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-lamp/40 bg-night-2">
					<img
						src={currentEffectiveAvatar}
						alt="Avatar preview"
						class="h-full w-full object-cover"
						onerror={(e) => {
							(e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
						}}
					/>
				</div>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<span class="text-sm font-semibold text-cream truncate">{callsign || 'night-owl'}</span>
						<span class="inline-flex items-center gap-1 rounded bg-lamp/15 px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider text-lamp border border-lamp/30">
							Active
						</span>
					</div>
					<p class="text-[11px] text-faint truncate font-mono">
						{avatarType === 'google' ? 'Google Account Photo' : 'Nocturnal Avatar'} · Ready for the room
					</p>
				</div>
			</div>

			<!-- Form Inputs -->
			<div class="mt-5 space-y-4">
				<!-- 1. Display Name Input -->
				<div>
					<div class="flex items-center justify-between mb-1.5">
						<label for="setup-callsign" class="text-xs font-medium text-cream flex items-center gap-1.5">
							<span>Display Name</span>
							<span class="text-[10px] text-faint font-mono">(Visible to all peers)</span>
						</label>
						<span class="text-[10px] text-faint font-mono">{callsign.length}/24</span>
					</div>

					<div class="relative flex items-center">
						<input
							id="setup-callsign"
							type="text"
							maxlength="24"
							bind:value={callsign}
							placeholder="Enter your name or callsign..."
							class="w-full rounded-xl border border-cream/15 bg-night-2 px-3.5 py-2.5 pr-24 text-sm text-cream placeholder-faint/60 outline-none transition-colors focus:border-lamp/60 focus:ring-1 focus:ring-lamp/40"
						/>
						<button
							type="button"
							class="absolute right-1.5 inline-flex items-center gap-1 rounded-lg border border-cream/12 bg-night-3 px-2 py-1 text-[11px] font-mono text-taupe hover:text-lamp hover:border-lamp/40 transition-colors cursor-pointer"
							onclick={handleRandomCallsign}
							title="Generate random nocturnal callsign"
						>
							<IconDice size={13} stroke={1.8} class="text-lamp" />
							<span>Random</span>
						</button>
					</div>
				</div>

				<!-- 2. Avatar Choice -->
				<div>
					<span class="block text-xs font-medium text-cream mb-2">
						Profile Picture
					</span>

					<!-- If Google photo is available: Choice between Google Photo vs. Nocturnal Avatars -->
					{#if isGoogleUser && googlePhoto}
						<div class="grid grid-cols-2 gap-2.5 mb-3">
							<!-- Option A: Google Photo -->
							<button
								type="button"
								class="flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all cursor-pointer {avatarType === 'google' ? 'border-lamp bg-lamp/15 text-cream ring-1 ring-lamp/40 shadow-sm' : 'border-cream/10 bg-night-2 text-taupe hover:border-cream/25 hover:text-cream'}"
								onclick={() => (avatarType = 'google')}
							>
								<div class="relative">
									<img
										src={googlePhoto}
										alt="Google Profile"
										class="h-10 w-10 rounded-full object-cover border border-cream/20 shadow"
									/>
									{#if avatarType === 'google'}
										<div class="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-lamp text-night font-bold">
											<IconCheck size={10} stroke={3} />
										</div>
									{/if}
								</div>
								<div class="min-w-0 w-full">
									<p class="text-xs font-medium truncate flex items-center justify-center gap-1">
										<IconBrandGoogle size={11} stroke={2} class="text-lamp" />
										<span>Google Photo</span>
									</p>
									<p class="text-[10px] text-faint truncate">Use your Google picture</p>
								</div>
							</button>

							<!-- Option B: Nocturnal Avatar -->
							<button
								type="button"
								class="flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all cursor-pointer {avatarType === 'avatar' ? 'border-lamp bg-lamp/15 text-cream ring-1 ring-lamp/40 shadow-sm' : 'border-cream/10 bg-night-2 text-taupe hover:border-cream/25 hover:text-cream'}"
								onclick={() => (avatarType = 'avatar')}
							>
								<div class="relative">
									<img
										src={selectedAvatarUrl}
										alt="Nocturnal Avatar"
										class="h-10 w-10 rounded-full object-cover border border-cream/20 shadow"
									/>
									{#if avatarType === 'avatar'}
										<div class="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-lamp text-night font-bold">
											<IconCheck size={10} stroke={3} />
										</div>
									{/if}
								</div>
								<div class="min-w-0 w-full">
									<p class="text-xs font-medium truncate flex items-center justify-center gap-1">
										<IconSparkles size={11} stroke={2} class="text-amber" />
										<span>Doodle Avatar</span>
									</p>
									<p class="text-[10px] text-faint truncate">Choose from 6 hand-drawn sketches</p>
								</div>
							</button>
						</div>
					{/if}

					<!-- Sketch Avatars Grid (Active when avatarType is 'avatar' or non-Google user) -->
					{#if !isGoogleUser || !googlePhoto || avatarType === 'avatar'}
						<div class="rounded-xl border border-cream/10 bg-night-2 p-3">
							<p class="text-[11px] font-mono text-faint mb-2.5 flex items-center gap-1.5">
								<IconSparkles size={12} stroke={1.8} class="text-lamp" />
								<span>Select a hand-drawn sketch avatar:</span>
							</p>

							<div class="grid grid-cols-3 gap-2">
								{#each NOCTURNAL_AVATARS as av}
									{@const selected = selectedAvatarUrl === av.url}
									<button
										type="button"
										class="group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all cursor-pointer {selected ? 'border-lamp bg-lamp/15 text-cream ring-1 ring-lamp/50' : 'border-cream/8 bg-night/60 text-taupe hover:border-cream/25 hover:text-cream'}"
										onclick={() => {
											avatarType = 'avatar';
											selectedAvatarUrl = av.url;
										}}
										title={av.description}
									>
										<div class="relative h-9 w-9 overflow-hidden rounded-full border border-cream/20 transition-transform group-hover:scale-105">
											<img src={av.url} alt={av.name} class="h-full w-full object-cover" />
											{#if selected}
												<div class="absolute inset-0 flex items-center justify-center bg-night/40 backdrop-blur-[0.5px]">
													<IconCheck size={14} stroke={3} class="text-lamp" />
												</div>
											{/if}
										</div>
										<span class="text-[10px] font-mono font-medium truncate w-full text-center {selected ? 'text-lamp' : 'text-taupe'}">
											{av.name}
										</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Error message if any -->
			{#if errorMessage}
				<p class="mt-3 text-xs text-ruby font-mono">
					{errorMessage}
				</p>
			{/if}

			<!-- Submit Action Button -->
			<div class="mt-6 flex items-center justify-end gap-2.5 border-t border-cream/10 pt-4">
				<button
					type="button"
					class="btn btn-ghost btn-sm text-xs text-taupe hover:text-cream"
					onclick={() => (open = false)}
				>
					Skip for now
				</button>

				<button
					type="button"
					disabled={saving || !callsign.trim()}
					class="btn btn-primary btn-sm px-4 py-2 text-xs font-mono flex items-center gap-1.5 font-medium cursor-pointer shadow-md transition-all hover:scale-[1.02] disabled:opacity-50"
					onclick={handleSave}
				>
					<span>{saving ? 'Saving...' : 'Confirm & Enter Room'}</span>
					<IconArrowRight size={13} stroke={2} />
				</button>
			</div>
		</div>
	</div>
{/if}
