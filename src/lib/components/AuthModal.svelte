<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '#lib/auth.svelte';
	import { isSupabaseConfigured } from '#lib/supabase';
	import { room } from '#lib/room/room.svelte';
	import { getUserProfileStats, type UserProfileStats, type Achievement } from '#lib/data/profile-stats';
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
	import IconTrophy from '@tabler/icons-svelte/icons/trophy';
	import IconAward from '@tabler/icons-svelte/icons/award';
	import IconFlame from '@tabler/icons-svelte/icons/flame';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconDisc from '@tabler/icons-svelte/icons/disc';
	import IconTarget from '@tabler/icons-svelte/icons/target';
	import IconCrown from '@tabler/icons-svelte/icons/crown';
	import IconBolt from '@tabler/icons-svelte/icons/bolt';
	import IconLock from '@tabler/icons-svelte/icons/lock';
	import IconClock from '@tabler/icons-svelte/icons/clock';
	import IconSparkles from '@tabler/icons-svelte/icons/sparkles';
	import AuthDialog from './AuthDialog.svelte';

	let open = $state(false);
	let isEditing = $state(false);
	let authDialogOpen = $state(false);
	let authDialogMode = $state<'signin' | 'signup'>('signin');
	let dropdownTab = $state<'profile' | 'stats'>('profile');
	let modalTab = $state<'edit' | 'stats'>('edit');
	let userStats = $state<UserProfileStats>(getUserProfileStats());
	const achievedBadges = $derived(userStats.achievements.filter((a) => a.unlocked));
	const isLockedInRoom = $derived(room.joinState === 'approved');

	function refreshStats(): void {
		userStats = getUserProfileStats(currentDisplayName);
	}

	function getTierBadgeClass(tier: Achievement['tier']): string {
		switch (tier) {
			case 'bronze':
				return 'border-amber/40 bg-amber/10 text-amber';
			case 'silver':
				return 'border-teal-500/40 bg-teal-500/10 text-aqua-foam';
			case 'gold':
				return 'border-amber/50 bg-amber/15 text-amber';
			case 'neon':
				return 'border-violet-400/50 bg-violet-400/10 text-violet-300';
		}
	}

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

	// Hidden file input reference
	let fileInput: HTMLInputElement | undefined = $state();

	const PRESET_AVATARS = [
		{ id: 'lofigirl', name: 'Lo-Fi Girl', url: '/avatars/lofi-girl.svg' },
		{ id: 'lofiboy', name: 'Lo-Fi Boy', url: '/avatars/lofi-boy.svg' },
		{ id: 'cybergirl', name: 'Cyber Girl', url: '/avatars/cyber-girl.svg' },
		{ id: 'cyberboy', name: 'Cyber Boy', url: '/avatars/cyber-boy.svg' },
		{ id: 'nightdev', name: 'Night Dev', url: '/avatars/night-dev.svg' },
		{ id: 'beatsguy', name: 'Beats Guy', url: '/avatars/beats-producer.svg' },
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

		const cleanCallsign = isLockedInRoom
			? (room.name || 'night-owl')
			: (editCallsign.trim() || room.name || 'night-owl');
		const cleanAvatar = editAvatar.trim() || '/default-avatar.svg';

		try {
			// Update local room state and storage
			if (!isLockedInRoom) {
				room.setName(cleanCallsign);
			}
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
				closeModal();
				saveSuccess = false;
			}, 900);
		} catch (err: any) {
			errorMessage = err?.message || 'Could not save profile changes.';
		} finally {
			saving = false;
		}
	}

	async function handleSignOut() {
		await auth.signOut();
		syncFromCurrentProfile();
		closeModal();
	}

	function closeModal(): void {
		isEditing = false;
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeModal();
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
		refreshStats();
		const onOpen = (e: Event) => {
			const custom = e as CustomEvent<{ edit?: boolean }>;
			openModal(Boolean(custom?.detail?.edit));
		};
		const onAuth = (e: Event) => {
			const custom = e as CustomEvent<{ mode?: 'signin' | 'signup' }>;
			authDialogMode = custom?.detail?.mode || 'signin';
			authDialogOpen = true;
			open = false;
		};
		const onStats = () => refreshStats();
		window.addEventListener('an:open-profile-modal', onOpen);
		window.addEventListener('an:open-auth-modal', onAuth);
		window.addEventListener('an:stats-updated', onStats);
		window.addEventListener('an:profile-updated', onStats);
		return () => {
			window.removeEventListener('an:open-profile-modal', onOpen);
			window.removeEventListener('an:open-auth-modal', onAuth);
			window.removeEventListener('an:stats-updated', onStats);
			window.removeEventListener('an:profile-updated', onStats);
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
			role="region"
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

			<!-- Segmented Tabs: Profile vs Stats & Badges -->
			<div class="mt-2.5 flex rounded-lg bg-[#060a0b] p-0.5 border border-cream/10 text-xs">
				<button
					type="button"
					class="flex-1 rounded-md py-1 font-mono text-[11px] font-medium transition-all {dropdownTab === 'profile' ? 'bg-cream/15 text-cream shadow-sm' : 'text-faint hover:text-cream'}"
					onclick={() => (dropdownTab = 'profile')}
				>
					Profile
				</button>
				<button
					type="button"
					class="flex-1 rounded-md py-1 font-mono text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 {dropdownTab === 'stats' ? 'bg-lamp/15 text-lamp border border-lamp/30 shadow-sm' : 'text-faint hover:text-cream'}"
					onclick={() => {
						refreshStats();
						dropdownTab = 'stats';
					}}
				>
					<IconTrophy size={12} stroke={1.8} />
					<span>Stats & Badges</span>
					<span class="rounded bg-lamp/20 px-1 py-0.2 text-[9px] font-bold text-lamp">
						{userStats.unlockedCount}/{userStats.totalAchievements}
					</span>
				</button>
			</div>

			{#if dropdownTab === 'profile'}
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
							modalTab = 'edit';
							isEditing = true;
						}}
					>
						<IconPencil size={13} stroke={2} />
						<span>Edit Profile</span>
					</button>
				</div>
			{:else}
				<!-- STATS & BADGES VIEW IN DROPDOWN -->
				<div class="mt-3 space-y-2.5">
					<!-- Rank Banner -->
					<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-3">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-[9px] font-mono uppercase tracking-wider text-faint">Nocturnal Rank</p>
								<div class="flex items-center gap-1.5 mt-0.5">
									<span class="text-xs font-bold text-amber font-mono">{userStats.rank.title}</span>
									<span class="rounded bg-amber/10 border border-amber/30 px-1 py-0.2 text-[9px] font-mono text-amber">
										Lvl {userStats.rank.level}
									</span>
								</div>
							</div>
							<div class="text-right">
								<p class="text-[9px] font-mono uppercase tracking-wider text-faint">Total Focus</p>
								<p class="text-xs font-semibold text-cream font-mono">{userStats.totalHoursFormatted}</p>
							</div>
						</div>
						{#if userStats.rank.nextTitle !== 'Max Rank'}
							<div class="mt-2">
								<div class="flex items-center justify-between text-[9px] text-faint font-mono mb-1">
									<span>Next: {userStats.rank.nextTitle}</span>
									<span>{userStats.rank.progress}%</span>
								</div>
								<div class="h-1.5 w-full rounded-full bg-night-3 overflow-hidden border border-cream/10">
									<div class="h-full rounded-full bg-lamp transition-all duration-500" style="width: {userStats.rank.progress}%"></div>
								</div>
							</div>
						{/if}
					</div>

					<!-- 4-Grid Metrics -->
					<div class="grid grid-cols-2 gap-2">
						<div class="rounded-lg border border-cream/10 bg-[#060a0b] p-2">
							<p class="text-[9px] font-mono uppercase tracking-wider text-faint flex items-center gap-1">
								<IconMoon size={11} class="text-lamp" />
								All-Nighters
							</p>
							<p class="mt-0.5 text-sm font-bold font-mono text-cream">{userStats.nightsCount}</p>
						</div>
						<div class="rounded-lg border border-cream/10 bg-[#060a0b] p-2">
							<p class="text-[9px] font-mono uppercase tracking-wider text-faint flex items-center gap-1">
								<IconDisc size={11} class="text-aqua-foam" />
								Tracks Queued
							</p>
							<p class="mt-0.5 text-sm font-bold font-mono text-cream">{userStats.tracksQueued}</p>
						</div>
						<div class="rounded-lg border border-cream/10 bg-[#060a0b] p-2">
							<p class="text-[9px] font-mono uppercase tracking-wider text-faint flex items-center gap-1">
								<IconSun size={11} class="text-amber" />
								Sunrise Rituals
							</p>
							<p class="mt-0.5 text-sm font-bold font-mono {userStats.dawnRituals > 0 ? 'text-amber' : 'text-cream'}">{userStats.dawnRituals}</p>
						</div>
						<div class="rounded-lg border border-cream/10 bg-[#060a0b] p-2">
							<p class="text-[9px] font-mono uppercase tracking-wider text-faint flex items-center gap-1">
								<IconBolt size={11} class="text-yellow-300" />
								Focus Time
							</p>
							<p class="mt-0.5 text-sm font-bold font-mono text-cream">{userStats.focusMinutes}m</p>
						</div>
					</div>

					<!-- Scrollable Badges List -->
					<div>
						<div class="flex items-center justify-between mb-1">
							<span class="text-[9px] font-mono uppercase tracking-wider text-faint">Achieved Badges</span>
							<span class="text-[9px] font-mono text-lamp">{achievedBadges.length} Unlocked</span>
						</div>
						<div class="space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5 custom-scrollbar">
							{#each achievedBadges as a (a.id)}
								<div class="flex items-center justify-between gap-2 rounded-lg border p-1.5 text-xs transition-colors border-cream/15 bg-[#060a0b]">
									<div class="flex items-center gap-2 min-w-0">
										<span class="grid h-6 w-6 shrink-0 place-items-center rounded-lg border text-xs select-none {getTierBadgeClass(a.tier)}">
											{a.emoji}
										</span>
										<div class="min-w-0">
											<p class="truncate text-[11px] font-medium text-cream">{a.title}</p>
											<p class="truncate text-[9px] text-faint">{a.description}</p>
										</div>
									</div>
									<span class="shrink-0 rounded bg-lamp/15 px-1 py-0.2 font-mono text-[8px] uppercase tracking-wider text-lamp border border-lamp/30">
										✓ Done
									</span>
								</div>
							{:else}
								<p class="text-[11px] text-faint text-center py-3 bg-[#060a0b] rounded-lg border border-cream/5 font-mono">
									No badges achieved yet
								</p>
							{/each}
						</div>
					</div>

					<!-- Button to open full modal on achievements tab -->
					<button
						type="button"
						class="btn btn-ghost btn-sm w-full py-1.5 text-xs flex items-center justify-center gap-1.5 border border-cream/20 hover:border-lamp/40 hover:text-lamp transition-colors"
						onclick={() => {
							refreshStats();
							modalTab = 'stats';
							isEditing = true;
						}}
					>
						<IconAward size={13} stroke={2} class="text-lamp" />
						<span>Open Full Dossier</span>
					</button>
				</div>
			{/if}

			<!-- Account / Cloud Sync Card -->
			<div class="mt-3 rounded-xl border border-cream/10 bg-[#060a0b] p-3 text-xs">
				{#if auth.isCloudUser}
					<div class="flex items-center justify-between gap-2">
						<div class="min-w-0">
							<div class="flex items-center gap-1.5">
								<span class="h-1.5 w-1.5 rounded-full bg-lamp"></span>
								<p class="text-[9px] font-mono uppercase tracking-wider text-lamp font-semibold">Cloud Synced</p>
							</div>
							<p class="truncate text-[11px] font-medium text-cream mt-0.5">{auth.user?.email}</p>
						</div>
						<button
							type="button"
							class="inline-flex items-center gap-1 rounded-lg border border-ruby/30 bg-ruby/10 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-ruby/20 transition-colors cursor-pointer"
							onclick={handleSignOut}
						>
							<IconLogout size={12} stroke={1.5} />
							<span>Sign Out</span>
						</button>
					</div>
				{:else}
					<div>
						<div class="flex items-center gap-2 mb-1.5">
							<span class="grid h-6 w-6 place-items-center rounded-lg bg-lamp/15 text-lamp shrink-0">
								<IconSparkles size={13} stroke={2} />
							</span>
							<div class="min-w-0">
								<p class="text-[11px] font-semibold text-cream leading-tight">Save Your Night Progress</p>
								<p class="text-[10px] text-faint">Sync badges, rank & history</p>
							</div>
						</div>
						<p class="text-[11px] text-taupe leading-relaxed mt-1">
							Currently playing as guest. Sign in or create an account to preserve your nocturnal history across all devices.
						</p>
						<div class="mt-3 flex items-center gap-2">
							<button
								type="button"
								class="btn btn-primary btn-sm flex-1 text-xs py-1.5 font-mono cursor-pointer flex items-center justify-center gap-1"
								onclick={() => {
									open = false;
									authDialogMode = 'signin';
									authDialogOpen = true;
								}}
							>
								Sign In
							</button>
							<button
								type="button"
								class="btn btn-ghost btn-sm flex-1 text-xs py-1.5 font-mono border border-cream/15 text-cream hover:border-amber/50 hover:text-amber cursor-pointer flex items-center justify-center gap-1"
								onclick={() => {
									open = false;
									authDialogMode = 'signup';
									authDialogOpen = true;
								}}
							>
								Sign Up
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Dedicated Global Auth Dialog (Sign In / Sign Up) -->
<AuthDialog bind:open={authDialogOpen} initialMode={authDialogMode} onSuccess={syncFromCurrentProfile} />

<!-- 2. FULL SCREEN EDIT PROFILE MODAL (opens when user clicks "Edit Profile" or chooses to edit) -->
{#if open && isEditing}
	<div
		use:portal
		class="fixed inset-0 z-50 flex items-center justify-center bg-night/90 p-3 sm:p-6 backdrop-blur-md overflow-hidden"
		role="dialog"
		aria-modal="true"
		aria-label="Edit Profile"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
	>
		<div
			class="relative w-full max-w-xl max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-2xl border border-cream/20 bg-[#0a1012] shadow-2xl text-cream overflow-hidden my-auto"
		>
			<!-- Fixed Fullscreen Edit Header -->
			<div class="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-cream/10 shrink-0">
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
					onclick={closeModal}
					aria-label="Close"
				>
					<IconX size={18} stroke={1.5} />
				</button>
			</div>

			<!-- Fixed Modal View Tabs: Profile vs Achievements & Stats -->
			<div class="px-5 sm:px-6 pt-3.5 pb-2.5 shrink-0 bg-[#0a1012] border-b border-cream/5">
				<div class="flex rounded-xl bg-[#060a0b] p-1 border border-cream/10 text-xs font-mono">
					<button
						type="button"
						class="flex-1 rounded-lg py-2 font-medium transition-all flex items-center justify-center gap-2 {modalTab === 'edit' ? 'bg-cream/15 text-cream shadow-sm' : 'text-faint hover:text-cream'}"
						onclick={() => (modalTab = 'edit')}
					>
						<IconPencil size={14} stroke={2} />
						<span>Profile & Appearance</span>
					</button>
					<button
						type="button"
						class="flex-1 rounded-lg py-2 font-medium transition-all flex items-center justify-center gap-2 {modalTab === 'stats' ? 'bg-lamp/15 text-lamp border border-lamp/30 shadow-sm' : 'text-faint hover:text-cream'}"
						onclick={() => {
							refreshStats();
							modalTab = 'stats';
						}}
					>
						<IconTrophy size={14} stroke={2} />
						<span>Achievements & Stats</span>
						<span class="rounded bg-lamp/20 px-1.5 py-0.5 text-[10px] font-bold text-lamp">
							{userStats.unlockedCount}/{userStats.totalAchievements}
						</span>
					</button>
				</div>
			</div>

			<!-- Scrollable Modal Body with Sleek Custom Scrollbar -->
			<div class="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 pt-4">

			{#if modalTab === 'stats'}
				<div class="mt-4 space-y-4">
					<!-- Hero Rank & Progression Card -->
					<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-4 sm:p-5">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div class="flex items-center gap-3">
								<span class="grid h-12 w-12 place-items-center rounded-xl border border-lamp/35 bg-lamp/10 text-lamp">
									<IconAward size={26} stroke={1.8} />
								</span>
								<div>
									<div class="flex items-center gap-2">
										<h4 class="font-mono text-lg font-bold text-amber">{userStats.rank.title}</h4>
										<span class="rounded-full bg-amber/15 border border-amber/30 px-2 py-0.5 font-mono text-[10px] font-bold text-amber">
											Level {userStats.rank.level}
										</span>
									</div>
									<p class="text-xs text-taupe mt-0.5">
										Nocturnal builder standing · {userStats.unlockedCount} of {userStats.totalAchievements} achievements unlocked
									</p>
								</div>
							</div>
							<div class="text-right">
								<p class="text-[10px] font-mono uppercase tracking-wider text-faint">Total Focus Logged</p>
								<p class="text-lg font-bold text-lamp font-mono">{userStats.totalHoursFormatted}</p>
							</div>
						</div>

						{#if userStats.rank.nextTitle !== 'Max Rank'}
							<div class="mt-4 pt-3 border-t border-cream/10">
								<div class="flex items-center justify-between text-xs text-faint font-mono mb-1.5">
									<span>Progress to {userStats.rank.nextTitle}</span>
									<span class="text-cream font-medium">{userStats.rank.progress}%</span>
								</div>
								<div class="h-2 w-full rounded-full bg-night-3 overflow-hidden border border-cream/10 p-[1px]">
									<div class="h-full rounded-full bg-gradient-to-r from-teal-500 to-lamp transition-all duration-700" style="width: {userStats.rank.progress}%"></div>
								</div>
							</div>
						{/if}
					</div>

					<!-- 4 Key Stats Tiles -->
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
						<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-3 text-center">
							<span class="grid h-7 w-7 mx-auto place-items-center rounded-lg bg-lamp/10 text-lamp mb-1.5">
								<IconMoon size={15} stroke={2} />
							</span>
							<p class="text-xl font-bold font-mono text-cream">{userStats.nightsCount}</p>
							<p class="text-[10px] font-mono uppercase tracking-wider text-faint mt-0.5">All-Nighters</p>
						</div>
						<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-3 text-center">
							<span class="grid h-7 w-7 mx-auto place-items-center rounded-lg bg-aqua-foam/10 text-aqua-foam mb-1.5">
								<IconDisc size={15} stroke={2} />
							</span>
							<p class="text-xl font-bold font-mono text-cream">{userStats.tracksQueued}</p>
							<p class="text-[10px] font-mono uppercase tracking-wider text-faint mt-0.5">Tracks Queued</p>
						</div>
						<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-3 text-center">
							<span class="grid h-7 w-7 mx-auto place-items-center rounded-lg bg-amber/10 text-amber mb-1.5">
								<IconSun size={15} stroke={2} />
							</span>
							<p class="text-xl font-bold font-mono {userStats.dawnRituals > 0 ? 'text-amber' : 'text-cream'}">{userStats.dawnRituals}</p>
							<p class="text-[10px] font-mono uppercase tracking-wider text-faint mt-0.5">Sunrise Rituals</p>
						</div>
						<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-3 text-center">
							<span class="grid h-7 w-7 mx-auto place-items-center rounded-lg bg-yellow-400/10 text-yellow-300 mb-1.5">
								<IconBolt size={15} stroke={2} />
							</span>
							<p class="text-xl font-bold font-mono text-cream">{userStats.focusMinutes}m</p>
							<p class="text-[10px] font-mono uppercase tracking-wider text-faint mt-0.5">Focus Minutes</p>
						</div>
					</div>

					<!-- Achieved Badges & Milestones in Responsive Grid -->
					<div>
						<div class="flex items-center justify-between mb-2">
							<h4 class="text-xs font-mono uppercase tracking-wider text-faint">Achieved Badges & Milestones</h4>
							<span class="text-xs font-mono text-lamp">{achievedBadges.length} Unlocked</span>
						</div>
						{#if achievedBadges.length > 0}
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
								{#each achievedBadges as a (a.id)}
									<div class="flex flex-col justify-between rounded-xl border p-3 transition-colors border-cream/15 bg-[#060a0b]">
										<div>
											<div class="flex items-start justify-between gap-2">
												<div class="flex items-center gap-2.5">
													<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-xl {getTierBadgeClass(a.tier)} shadow-sm select-none">
														{a.emoji}
													</span>
													<div class="min-w-0">
														<p class="text-sm font-semibold text-cream leading-tight truncate">{a.title}</p>
														<span class="text-[9px] font-mono uppercase tracking-wider text-faint">{a.category}</span>
													</div>
												</div>
												<span class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider border {getTierBadgeClass(a.tier)}">
													{a.tier}
												</span>
											</div>
											<p class="mt-2 text-xs text-taupe leading-relaxed">{a.description}</p>
										</div>

										<div class="mt-3 pt-2 border-t border-cream/5">
											<div class="flex items-center justify-between text-[11px] font-mono text-lamp">
												<span class="inline-flex items-center gap-1 font-semibold">
													<IconCheck size={13} stroke={2.5} />
													Unlocked
												</span>
												<span class="text-[10px] text-faint">Completed</span>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-6 text-center">
								<span class="grid h-10 w-10 mx-auto place-items-center rounded-xl bg-lamp/10 text-lamp mb-2">
									<IconAward size={20} stroke={1.5} />
								</span>
								<p class="text-sm font-medium text-cream">No badges achieved yet</p>
								<p class="text-xs text-taupe mt-1 max-w-[36ch] mx-auto">
									Complete full all-nighters, declare intentions, and queue tracks with the crew to earn milestone badges.
								</p>
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					<!-- Live Preview Hero Card in Edit Mode -->
					<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-4">
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
						{#if isLockedInRoom}
							<span class="font-mono text-[10px] text-amber">Locked in session</span>
						{:else}
							<span class="font-mono text-[10px] text-faint">{editCallsign.length}/24</span>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<input
							id="fullscreen-callsign"
							type="text"
							maxlength="24"
							disabled={isLockedInRoom}
							class="w-full rounded-lg border border-cream/15 bg-night px-3 py-2 text-sm font-mono outline-none transition-colors {isLockedInRoom ? 'text-taupe bg-night/50 cursor-not-allowed opacity-75' : 'text-cream focus:border-lamp'}"
							placeholder="e.g. midnight-coder"
							bind:value={editCallsign}
						/>
						{#if !isLockedInRoom}
							<button
								type="button"
								class="btn btn-ghost btn-sm px-2.5 py-2 shrink-0 border border-cream/15 hover:border-lamp/50 hover:text-lamp"
								onclick={handleRandomCallsign}
								title="Generate random night callsign"
							>
								<IconDice size={16} stroke={1.5} />
								<span class="hidden sm:inline text-xs">Random</span>
							</button>
						{/if}
					</div>
					{#if isLockedInRoom}
						<p class="mt-1.5 text-[11px] text-faint font-mono">
							Callsign cannot be changed after joining a room. Step out to change your callsign.
						</p>
					{/if}
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
		</div>
	{/if}
</div>

			<!-- Fixed Footer Action Buttons -->
			<div class="flex items-center justify-between p-4 sm:p-5 border-t border-cream/10 bg-[#060a0b] shrink-0">
				{#if modalTab === 'stats'}
					<a href="/archive" class="btn btn-ghost btn-sm text-xs inline-flex items-center gap-1.5" onclick={closeModal}>
						<IconMoon size={14} stroke={1.5} />
						<span>Open My Logbook</span>
					</a>
					<button type="button" class="btn btn-primary btn-sm text-xs px-5" onclick={closeModal}>
						Done
					</button>
				{:else}
					<button
						type="button"
						class="btn btn-ghost btn-sm text-xs px-4"
						onclick={closeModal}
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
				{/if}
			</div>
		</div>
	</div>
{/if}
