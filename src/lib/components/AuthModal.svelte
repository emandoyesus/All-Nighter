<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '#lib/auth.svelte';
	import { isSupabaseConfigured } from '#lib/supabase';
	import { room } from '#lib/room/room.svelte';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconDice from '@tabler/icons-svelte/icons/dice';
	import IconUpload from '@tabler/icons-svelte/icons/upload';
	import IconPhoto from '@tabler/icons-svelte/icons/photo';
	import IconLink from '@tabler/icons-svelte/icons/link';
	import IconLogout from '@tabler/icons-svelte/icons/logout';
	import IconPencil from '@tabler/icons-svelte/icons/pencil';
	import IconCamera from '@tabler/icons-svelte/icons/camera';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';

	let open = $state(false);
	let isEditing = $state(false);
	let showAuthForm = $state(false);
	let isSignUp = $state(false);

	// Profile draft states
	let editCallsign = $state('');
	let editAvatar = $state('');
	let editIntention = $state('');
	let editMood = $state('');
	let avatarTab = $state<'upload' | 'presets' | 'url'>('upload');
	let customUrlInput = $state('');

	// Feedback & loading
	let saving = $state(false);
	let saveSuccess = $state(false);
	let errorMessage = $state('');
	let imgPreviewError = $state(false);

	// Auth form states
	let authEmail = $state('');
	let authPassword = $state('');
	let authLoading = $state(false);
	let authError = $state('');
	let authSuccess = $state('');

	// Hidden file input reference
	let fileInput: HTMLInputElement | undefined = $state();

	const PRESET_AVATARS = [
		{ id: 'lofigirl', name: 'Lo-Fi Girl', url: '/avatars/lofi-girl.svg' },
		{ id: 'cybergirl', name: 'Cyber Girl', url: '/avatars/cyber-girl.svg' },
		{ id: 'hoodie', name: 'Dark Hoodie', url: '/default-avatar.svg' },
		{ id: 'moon', name: 'Midnight Moon', url: '/avatars/moon.svg' },
		{ id: 'owl', name: 'Night Owl', url: '/avatars/owl.svg' },
		{ id: 'headphones', name: 'Studio Cans', url: '/avatars/headphones.svg' },
		{ id: 'coffee', name: 'Espresso Mug', url: '/avatars/coffee.svg' },
		{ id: 'cassette', name: 'Analog Tape', url: '/avatars/cassette.svg' },
		{ id: 'vinyl', name: 'Vinyl Record', url: '/avatars/vinyl.svg' },
		{ id: 'terminal', name: 'Terminal Shell', url: '/avatars/terminal.svg' },
		{ id: 'saturn', name: 'Cosmic Saturn', url: '/avatars/saturn.svg' },
		{ id: 'cat', name: 'Neon Cat', url: '/avatars/cat.svg' }
	];

	const RANDOM_CALLSIGNS = [
		'midnight-coder',
		'cyber-runner',
		'dawn-chaser',
		'analog-ghost',
		'neon-pilot',
		'lofi-architect',
		'night-owl',
		'tape-rewind',
		'pixel-drifter',
		'synth-operator',
		'dark-mode',
		'moon-walker',
		'stellar-pulse',
		'echo-coder',
		'orbit-surfer',
		'terminal-sage',
		'velvet-groove',
		'quiet-storm',
		'clock-shifter',
		'sub-zero',
		'astral-dev',
		'binary-moth',
		'neon-solitude',
		'dawn-walker'
	];

	function syncFromCurrentProfile() {
		editCallsign = auth.displayName || room.name || 'night-owl';
		editAvatar = auth.avatarUrl || room.avatar || '/default-avatar.svg';
		editIntention = room.intention || '';
		editMood = room.statusText || '';
		customUrlInput = editAvatar.startsWith('http') ? editAvatar : '';
		imgPreviewError = false;
		saveSuccess = false;
		errorMessage = '';
	}

	function openModal(startEditing = false) {
		syncFromCurrentProfile();
		isEditing = startEditing;
		open = true;
	}

	function handleRandomCallsign() {
		const pool = RANDOM_CALLSIGNS.filter((c) => c !== editCallsign);
		const pick = pool[Math.floor(Math.random() * pool.length)];
		editCallsign = pick;
	}

	function selectPreset(url: string) {
		editAvatar = url;
		imgPreviewError = false;
	}

	function handleCustomUrlApply() {
		if (!customUrlInput.trim()) return;
		editAvatar = customUrlInput.trim();
		imgPreviewError = false;
	}

	function triggerUpload() {
		fileInput?.click();
	}

	function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			errorMessage = 'Please select a valid image file.';
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const img = new Image();
			img.onload = () => {
				// Resize to 256x256 cover crop for ultra-fast, compact profile storage
				const canvas = document.createElement('canvas');
				const size = 256;
				canvas.width = size;
				canvas.height = size;
				const ctx = canvas.getContext('2d');
				if (!ctx) return;

				const minSide = Math.min(img.width, img.height);
				const sx = (img.width - minSide) / 2;
				const sy = (img.height - minSide) / 2;

				ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
				const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
				editAvatar = dataUrl;
				imgPreviewError = false;
				errorMessage = '';
				isEditing = true;
			};
			img.src = reader.result as string;
		};
		reader.readAsDataURL(file);
		target.value = '';
	}

	async function handleSaveProfile() {
		saving = true;
		errorMessage = '';
		saveSuccess = false;

		const cleanCallsign = editCallsign.trim() || room.name || 'night-owl';
		const cleanAvatar = editAvatar.trim() || '/default-avatar.svg';

		try {
			// Update local room state and storage
			room.setName(cleanCallsign);
			room.setAvatar(cleanAvatar);
			room.setIntention(editIntention.trim());
			if (editMood !== room.statusText) {
				room.setStatus(editMood);
			}

			// If user is authenticated with Supabase, update account metadata
			if (auth.isAuthenticated && isSupabaseConfigured) {
				await auth.updateProfile({
					callsign: cleanCallsign,
					avatarUrl: cleanAvatar
				});
			}

			saveSuccess = true;
			window.dispatchEvent(new CustomEvent('an:profile-updated'));

			setTimeout(() => {
				isEditing = false;
				saveSuccess = false;
			}, 900);
		} catch (err: any) {
			errorMessage = err?.message || 'Could not save profile changes.';
		} finally {
			saving = false;
		}
	}

	async function handleAuthSubmit(e: SubmitEvent) {
		e.preventDefault();
		authError = '';
		authSuccess = '';
		authLoading = true;

		try {
			if (isSignUp) {
				const { data, error: err } = await auth.signUpWithEmail(
					authEmail,
					authPassword,
					editCallsign || room.name
				);
				if (err) throw err;
				if (data.session) {
					authSuccess = 'Account created & synced!';
					showAuthForm = false;
					syncFromCurrentProfile();
				} else {
					authSuccess = 'Verification email sent! Check your inbox.';
				}
			} else {
				const { data, error: err } = await auth.signInWithEmail(authEmail, authPassword);
				if (err) throw err;
				if (data.user?.user_metadata?.callsign) {
					room.setName(data.user.user_metadata.callsign);
				}
				if (data.user?.user_metadata?.avatar_url) {
					room.setAvatar(data.user.user_metadata.avatar_url);
				}
				authSuccess = 'Signed in!';
				showAuthForm = false;
				syncFromCurrentProfile();
			}
		} catch (err: any) {
			authError = err?.message || 'Authentication failed';
		} finally {
			authLoading = false;
		}
	}

	async function handleSignOut() {
		await auth.signOut();
		syncFromCurrentProfile();
		open = false;
		isEditing = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (isEditing) {
				isEditing = false;
			} else if (open) {
				open = false;
			}
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

	function clickOutside(node: HTMLElement, onOutside: () => void) {
		const handleClick = (e: MouseEvent | TouchEvent) => {
			if (node && !node.contains(e.target as Node)) {
				onOutside();
			}
		};
		document.addEventListener('pointerdown', handleClick, true);
		return {
			destroy() {
				document.removeEventListener('pointerdown', handleClick, true);
			}
		};
	}

	onMount(() => {
		const onOpen = (e: Event) => {
			const custom = e as CustomEvent<{ edit?: boolean }>;
			openModal(Boolean(custom?.detail?.edit));
		};
		window.addEventListener('an:open-profile-modal', onOpen);
		return () => {
			window.removeEventListener('an:open-profile-modal', onOpen);
		};
	});

	const currentDisplayAvatar = $derived(
		auth.avatarUrl || room.avatar || '/default-avatar.svg'
	);
	const currentDisplayName = $derived(
		auth.displayName || room.name || 'night-owl'
	);
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Hidden File Input for Device Photo Upload -->
<input
	type="file"
	accept="image/*"
	class="hidden"
	bind:this={fileInput}
	onchange={handleFileUpload}
/>

<!-- Root Container anchored in navigation -->
<div class="relative" use:clickOutside={() => { if (!isEditing) open = false; }}>
	<!-- Profile Trigger Button in Navigation -->
	<button
		type="button"
		class="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-lamp/30 bg-night-2 transition-all hover:border-lamp hover:scale-105 active:scale-95 p-0 overflow-hidden"
		onclick={() => {
			if (open && !isEditing) {
				open = false;
			} else {
				openModal(false);
			}
		}}
		title={`${currentDisplayName} · Profile & Settings`}
		aria-label={`Profile: ${currentDisplayName}`}
		aria-expanded={open}
	>
		<img
			src={currentDisplayAvatar}
			alt={currentDisplayName}
			class="h-full w-full rounded-full object-cover"
			onerror={(e) => {
				(e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
			}}
		/>
		{#if auth.isAuthenticated}
			<span
				class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-lamp border-2 border-night"
				title="Connected to Supabase"
			></span>
		{:else}
			<span
				class="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-aqua-foam/60 border border-night"
				title="Local Guest Profile"
			></span>
		{/if}
	</button>

	<!-- 1. SOLID, OPAQUE DROPDOWN (anchored right under profile icon, no transparency, no screen dimming) -->
	{#if open && !isEditing}
		<div
			class="absolute right-0 top-full mt-2.5 z-50 w-[310px] sm:w-[340px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-cream/20 bg-[#0a1012] p-4 shadow-2xl text-cream"
			role="dialog"
			aria-label="Night Profile"
		>
			<!-- Dropdown Header -->
			<div class="flex items-center justify-between pb-2.5 border-b border-cream/10">
				<div class="min-w-0">
					<h3 class="text-xs font-semibold uppercase tracking-wider text-cream truncate">
						Night Profile
					</h3>
				</div>
				<button
					type="button"
					class="rounded p-1 text-faint transition-colors hover:text-cream hover:bg-cream/10"
					onclick={() => (open = false)}
					aria-label="Close"
				>
					<IconX size={15} stroke={1.5} />
				</button>
			</div>

			<!-- Small text: "Edit your profile to be able to edit all this" -->
			<p class="mt-2.5 text-xs text-faint leading-tight">
				Edit your profile to be able to edit all this
			</p>

			<!-- Profile Preview Card (100% Solid, Non-transparent) -->
			<div class="mt-3 rounded-xl border border-cream/10 bg-[#060a0b] p-3">
				<div class="flex items-center gap-3">
					<!-- Avatar with direct upload trigger -->
					<div class="relative shrink-0 group">
						<img
							src={currentDisplayAvatar}
							alt={currentDisplayName}
							class="h-13 w-13 rounded-full object-cover border-2 border-lamp/40 bg-[#0a1012] transition-transform group-hover:scale-[1.03]"
							onerror={(e) => {
								(e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
							}}
						/>
						<span
							class="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-lamp border-2 border-[#060a0b]"
							title="Awake now"
						></span>

						<!-- Clickable camera overlay to upload photo directly -->
						<button
							type="button"
							class="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-[#060a0b]/85 text-lamp opacity-0 group-hover:opacity-100 transition-opacity"
							onclick={triggerUpload}
							title="Upload your own photo"
							aria-label="Upload your own photo"
						>
							<IconCamera size={15} stroke={1.7} />
							<span class="text-[8px] font-mono text-white">Upload</span>
						</button>
					</div>

					<!-- Details -->
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-1.5">
							<span class="font-mono text-sm sm:text-base font-bold text-lamp truncate">
								{currentDisplayName}
							</span>
							{#if room.statusText}
								<span class="rounded-full bg-cream/10 px-1.5 py-0.5 text-[9px] text-lamp font-medium">
									{room.statusText}
								</span>
							{/if}
						</div>

						<p class="text-[11px] text-taupe truncate">
							{#if auth.isAuthenticated}
								<span class="inline-flex items-center gap-1 text-[10px] text-lamp/90 font-mono">
									<IconCheck size={10} stroke={2} />
									{auth.user?.email}
								</span>
							{:else}
								<span class="text-[10px] text-faint font-mono">Guest Session</span>
							{/if}
						</p>

						<!-- Quick button to upload own photo directly from device -->
						<button
							type="button"
							class="mt-1.5 inline-flex items-center gap-1 rounded border border-cream/15 px-2 py-0.5 text-[10px] text-taupe transition-colors hover:border-lamp hover:text-lamp"
							onclick={triggerUpload}
							title="Upload your own photo"
						>
							<IconCamera size={11} stroke={1.7} />
							<span>Upload photo</span>
						</button>
					</div>
				</div>

				{#if room.intention}
					<p class="mt-2 text-[11px] text-cream/90 italic truncate border-t border-cream/10 pt-1.5">
						"{room.intention}"
					</p>
				{/if}
			</div>

			<!-- Main Action Button to enter Full Screen Edit Mode -->
			<div class="mt-3.5 space-y-2">
				<button
					type="button"
					class="btn btn-primary btn-sm w-full py-2 text-xs flex items-center justify-center gap-1.5"
					onclick={() => {
						syncFromCurrentProfile();
						isEditing = true;
					}}
				>
					<IconPencil size={13} stroke={2} />
					<span>Edit Profile</span>
				</button>
			</div>

			<!-- Account / Cloud Sync Card -->
			<div class="mt-3 rounded-xl border border-cream/10 bg-[#060a0b] p-2.5 text-xs">
				{#if auth.isAuthenticated}
					<div class="flex items-center justify-between">
						<div class="min-w-0">
							<p class="text-[9px] font-mono uppercase tracking-wider text-faint">Connected Account</p>
							<p class="truncate text-[11px] font-medium text-cream">{auth.user?.email}</p>
						</div>
						<button
							type="button"
							class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-rose-300 hover:bg-rose-500/10 transition-colors"
							onclick={handleSignOut}
						>
							<IconLogout size={12} stroke={1.5} />
							Sign Out
						</button>
					</div>
				{:else}
					<div>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-[11px] font-medium text-cream">Cloud Sync</p>
								<p class="text-[10px] text-faint">Keep profile across devices</p>
							</div>
							<button
								type="button"
								class="text-[11px] text-lamp hover:underline font-mono"
								onclick={() => (showAuthForm = !showAuthForm)}
							>
								{showAuthForm ? 'Close' : 'Sign In'}
							</button>
						</div>

						{#if showAuthForm}
							<form class="mt-2 space-y-2 pt-2 border-t border-cream/10" onsubmit={handleAuthSubmit}>
								{#if authError}
									<div class="rounded p-1.5 text-[11px] text-rose-300 bg-ruby/10 border border-ruby/30">
										{authError}
									</div>
								{/if}
								{#if authSuccess}
									<div class="rounded p-1.5 text-[11px] text-lamp bg-lamp/10 border border-lamp/30">
										{authSuccess}
									</div>
								{/if}
								<div>
									<input
										type="email"
										required
										class="w-full rounded border border-cream/15 bg-night px-2 py-1 text-xs text-cream outline-none focus:border-lamp font-mono"
										placeholder="Email address"
										bind:value={authEmail}
									/>
								</div>
								<div>
									<input
										type="password"
										required
										minlength="6"
										class="w-full rounded border border-cream/15 bg-night px-2 py-1 text-xs text-cream outline-none focus:border-lamp font-mono"
										placeholder="Password"
										bind:value={authPassword}
									/>
								</div>
								<div class="flex items-center justify-between pt-0.5">
									<button
										type="button"
										class="text-[10px] text-faint hover:text-cream underline"
										onclick={() => (isSignUp = !isSignUp)}
									>
										{isSignUp ? 'Sign In' : 'Create account'}
									</button>
									<button
										type="submit"
										class="btn btn-primary btn-sm text-[11px] px-2.5 py-0.5"
										disabled={authLoading}
									>
										{authLoading ? '...' : isSignUp ? 'Sign Up' : 'Sign In'}
									</button>
								</div>
							</form>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- 2. FULL SCREEN EDIT PROFILE MODAL (opens when user clicks "Edit Profile" or chooses to edit) -->
{#if open && isEditing}
	<div
		use:portal
		class="fixed inset-0 z-50 flex items-center justify-center bg-night/95 p-4 sm:p-6 backdrop-blur-md overflow-y-auto"
		role="dialog"
		aria-modal="true"
		aria-label="Edit Profile"
	>
		<div
			class="relative w-full max-w-xl rounded-2xl border border-cream/20 bg-[#0a1012] p-5 sm:p-7 shadow-2xl text-cream my-auto"
			use:clickOutside={() => (isEditing = false)}
		>
			<!-- Fullscreen Edit Header -->
			<div class="flex items-center justify-between pb-4 border-b border-cream/10">
				<div class="flex items-center gap-2.5">
					<span class="grid h-8 w-8 place-items-center rounded-lg border border-lamp/30 bg-lamp/10 text-lamp">
						<IconPencil size={16} stroke={2} />
					</span>
					<div>
						<h3 class="text-base sm:text-lg font-semibold text-cream leading-tight">
							Edit Profile
						</h3>
						<p class="text-xs text-faint">Customize your presence, photo, and nocturnal intention</p>
					</div>
				</div>
				<button
					type="button"
					class="rounded-lg p-1.5 text-faint transition-colors hover:text-cream hover:bg-cream/10"
					onclick={() => (isEditing = false)}
					aria-label="Close"
				>
					<IconX size={18} stroke={1.5} />
				</button>
			</div>

			<!-- Live Preview Hero Card in Edit Mode -->
			<div class="mt-4 rounded-xl border border-cream/10 bg-[#060a0b] p-4">
				<div class="flex items-center gap-4">
					<!-- Avatar with direct upload trigger -->
					<div class="relative shrink-0 group">
						<img
							src={!imgPreviewError && editAvatar ? editAvatar : '/default-avatar.svg'}
							alt={editCallsign || 'Preview'}
							class="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border-2 border-lamp/40 bg-[#0a1012] transition-transform group-hover:scale-[1.02]"
							onerror={() => (imgPreviewError = true)}
						/>
						<span
							class="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-lamp border-2 border-[#060a0b]"
							title="Awake now"
						></span>

						<button
							type="button"
							class="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-[#060a0b]/85 text-lamp opacity-0 group-hover:opacity-100 transition-opacity"
							onclick={triggerUpload}
							title="Upload your own photo"
							aria-label="Upload your own photo"
						>
							<IconCamera size={18} stroke={1.7} />
							<span class="text-[9px] font-mono text-white">Upload</span>
						</button>
					</div>

					<!-- Details in live preview -->
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span class="font-mono text-base sm:text-lg font-bold text-lamp truncate">
								{editCallsign.trim() || 'unnamed'}
							</span>
							{#if editMood}
								<span class="rounded-full bg-cream/10 px-2 py-0.5 text-[10px] text-lamp font-medium">
									{editMood}
								</span>
							{/if}
						</div>

						<p class="mt-0.5 text-xs text-taupe truncate">
							{#if auth.isAuthenticated}
								<span class="inline-flex items-center gap-1 text-[11px] text-lamp/90 font-mono">
									<IconCheck size={11} stroke={2} />
									{auth.user?.email}
								</span>
							{:else}
								<span class="text-[11px] text-faint font-mono">Guest Session · Local Profile</span>
							{/if}
						</p>

						{#if editIntention}
							<p class="mt-1.5 text-xs text-cream/90 italic truncate">
								"{editIntention}"
							</p>
						{/if}
					</div>
				</div>
			</div>

			{#if errorMessage}
				<div class="mt-3 rounded-lg border border-ruby/30 bg-ruby/10 p-2.5 text-xs text-rose-300">
					{errorMessage}
				</div>
			{/if}

			{#if saveSuccess}
				<div class="mt-3 flex items-center gap-2 rounded-lg border border-lamp/40 bg-lamp/10 p-2.5 text-xs font-medium text-lamp">
					<IconCheck size={15} stroke={2} />
					Profile updated successfully!
				</div>
			{/if}

			<!-- Edit Suite Form -->
			<div class="mt-5 space-y-4">
				<!-- Upload Photo & Presets Selector -->
				<div>
					<div class="flex items-center justify-between mb-2">
						<span class="text-xs font-mono uppercase tracking-wider text-faint">Profile Photo</span>
						<div class="flex rounded-md border border-cream/10 bg-[#060a0b] p-0.5 text-[11px] font-mono">
							<button
								type="button"
								class="rounded px-2.5 py-0.5 transition-colors {avatarTab === 'upload' ? 'bg-lamp/20 text-lamp font-medium' : 'text-faint hover:text-cream'}"
								onclick={() => (avatarTab = 'upload')}
							>
								Upload Photo
							</button>
							<button
								type="button"
								class="rounded px-2.5 py-0.5 transition-colors {avatarTab === 'presets' ? 'bg-lamp/20 text-lamp font-medium' : 'text-faint hover:text-cream'}"
								onclick={() => (avatarTab = 'presets')}
							>
								Presets
							</button>
							<button
								type="button"
								class="rounded px-2.5 py-0.5 transition-colors {avatarTab === 'url' ? 'bg-lamp/20 text-lamp font-medium' : 'text-faint hover:text-cream'}"
								onclick={() => (avatarTab = 'url')}
							>
								Image URL
							</button>
						</div>
					</div>

					{#if avatarTab === 'upload'}
						<!-- Direct Device Photo Upload Card -->
						<div class="rounded-xl border border-dashed border-cream/20 bg-[#060a0b] p-4 text-center">
							<div class="flex flex-col items-center gap-2">
								<span class="grid h-10 w-10 place-items-center rounded-full bg-lamp/10 text-lamp border border-lamp/30">
									<IconUpload size={18} stroke={1.5} />
								</span>
								<div>
									<p class="text-xs font-medium text-cream">Upload your own photo from device</p>
									<p class="text-[11px] text-faint">JPG, PNG, WebP or SVG · automatically cropped to square</p>
								</div>
								<button
									type="button"
									class="btn btn-primary btn-sm text-xs mt-1 px-4 py-1.5 inline-flex items-center gap-1.5"
									onclick={triggerUpload}
								>
									<IconUpload size={14} stroke={2} />
									<span>Choose Photo File</span>
								</button>
							</div>
						</div>
					{:else if avatarTab === 'presets'}
						<!-- Presets Grid -->
						<div class="grid grid-cols-4 sm:grid-cols-6 gap-2 rounded-xl border border-cream/10 bg-[#060a0b] p-2.5">
							{#each PRESET_AVATARS as preset (preset.id)}
								{@const selected = editAvatar === preset.url}
								<button
									type="button"
									class="group relative flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all {selected ? 'border border-lamp bg-lamp/15' : 'border border-cream/5 hover:border-cream/20 hover:bg-cream/5'}"
									onclick={() => selectPreset(preset.url)}
									title={preset.name}
								>
									<img
										src={preset.url}
										alt={preset.name}
										class="h-10 w-10 rounded-full object-cover border {selected ? 'border-lamp' : 'border-cream/15 group-hover:border-cream/40'}"
									/>
									<span class="truncate text-[9px] font-mono text-faint group-hover:text-cream max-w-full">
										{preset.name.split(' ')[0]}
									</span>
									{#if selected}
										<span class="absolute top-1 right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-lamp text-night">
											<IconCheck size={9} stroke={3} />
										</span>
									{/if}
								</button>
							{/each}
						</div>
					{:else if avatarTab === 'url'}
						<!-- Custom URL -->
						<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-3 space-y-2">
							<div class="flex items-center gap-2">
								<input
									type="url"
									class="w-full rounded-lg border border-cream/15 bg-night px-3 py-1.5 text-xs text-cream font-mono outline-none focus:border-lamp placeholder:text-faint/60"
									placeholder="https://example.com/your-avatar.jpg"
									bind:value={customUrlInput}
								/>
								<button
									type="button"
									class="btn btn-ghost btn-sm text-xs shrink-0 border border-cream/15 hover:border-lamp"
									onclick={handleCustomUrlApply}
								>
									Apply
								</button>
							</div>
							<p class="text-[10px] text-faint">Paste a public image link (Discord, GitHub, Gravatar, Unsplash, etc.)</p>
						</div>
					{/if}
				</div>

				<!-- Callsign input with random generator -->
				<div>
					<div class="flex items-center justify-between mb-1.5">
						<label for="fullscreen-callsign" class="text-xs font-mono uppercase tracking-wider text-faint">
							Callsign / Display Name
						</label>
						<span class="font-mono text-[10px] text-faint">{editCallsign.length}/24</span>
					</div>
					<div class="flex items-center gap-2">
						<input
							id="fullscreen-callsign"
							type="text"
							maxlength="24"
							class="w-full rounded-lg border border-cream/15 bg-night px-3 py-2 text-sm text-cream font-mono outline-none transition-colors focus:border-lamp"
							placeholder="e.g. midnight-coder"
							bind:value={editCallsign}
						/>
						<button
							type="button"
							class="btn btn-ghost btn-sm px-2.5 py-2 shrink-0 border border-cream/15 hover:border-lamp/50 hover:text-lamp"
							onclick={handleRandomCallsign}
							title="Generate random night callsign"
						>
							<IconDice size={16} stroke={1.5} />
							<span class="hidden sm:inline text-xs">Random</span>
						</button>
					</div>
				</div>

				<!-- Tonight's Intention -->
				<div>
					<label for="fullscreen-intention" class="block text-xs font-mono uppercase tracking-wider text-faint mb-1.5">
						Tonight's Intention / Focus
					</label>
					<input
						id="fullscreen-intention"
						type="text"
						maxlength="80"
						class="w-full rounded-lg border border-cream/15 bg-night px-3 py-2 text-sm text-cream outline-none focus:border-lamp placeholder:text-faint/60"
						placeholder="What are you working on tonight?"
						bind:value={editIntention}
					/>
				</div>

				<!-- Mood chips -->
				<div>
					<span class="block text-xs font-mono uppercase tracking-wider text-faint mb-1.5">Activity & Mood</span>
					<div class="flex flex-wrap gap-1.5">
						{#each ['🎧 Locked in', '💻 Coding', '✍️ Writing', '🎨 Designing', '📚 Studying', '🐛 Bug hunting', '☕ Coffee run', '🥱 4am wall', '🌌 Flow state'] as mood}
							<button
								type="button"
								class="rounded-full px-2.5 py-1 text-xs transition-colors border {editMood === mood
									? 'border-lamp bg-lamp/15 text-lamp font-medium'
									: 'border-cream/10 bg-[#060a0b] text-taupe hover:border-cream/25 hover:text-cream'}"
								onclick={() => (editMood = editMood === mood ? '' : mood)}
							>
								{mood}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Fullscreen Footer Action Buttons -->
			<div class="mt-6 flex items-center justify-between pt-4 border-t border-cream/10">
				<button
					type="button"
					class="btn btn-ghost btn-sm text-xs px-4"
					onclick={() => (isEditing = false)}
				>
					Cancel
				</button>

				<button
					type="button"
					class="btn btn-primary btn-sm text-xs px-5 py-2 inline-flex items-center gap-1.5"
					disabled={saving}
					onclick={handleSaveProfile}
				>
					{#if saving}
						<span class="soft-blink h-2 w-2 rounded-full bg-night"></span>
						Saving...
					{:else if saveSuccess}
						<IconCheck size={14} stroke={2.5} />
						Saved!
					{:else}
						Save Changes
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
