<script lang="ts">
	import { auth } from '#lib/auth.svelte';
	import { room } from '#lib/room/room.svelte';
	import { isSupabaseConfigured } from '#lib/supabase';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconMail from '@tabler/icons-svelte/icons/mail';
	import IconLock from '@tabler/icons-svelte/icons/lock';
	import IconEye from '@tabler/icons-svelte/icons/eye';
	import IconEyeOff from '@tabler/icons-svelte/icons/eye-off';
	import IconDice from '@tabler/icons-svelte/icons/dice';
	import IconAlertCircle from '@tabler/icons-svelte/icons/alert-circle';
	import IconArrowRight from '@tabler/icons-svelte/icons/arrow-right';

	let {
		open = $bindable(false),
		initialMode = 'signin',
		onSuccess = () => {}
	}: {
		open?: boolean;
		initialMode?: 'signin' | 'signup';
		onSuccess?: () => void;
	} = $props();

	let mode = $state<'signin' | 'signup'>('signin');
	let email = $state('');
	let password = $state('');
	let callsign = $state('');
	let avatarUrl = $state('/avatars/lofi-girl.svg');
	let showPassword = $state(false);
	let isGoogleLoading = $state(false);
	let isEmailLoading = $state(false);
	let loading = $derived(isGoogleLoading || isEmailLoading);
	let errorMessage = $state('');
	let emailSent = $state(false);

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

	// 6 character avatars (3 boys, 3 girls)
	const PRESET_AVATARS = [
		{ id: 'lofigirl', name: 'Lo-Fi Girl', url: '/avatars/lofi-girl.svg' },
		{ id: 'lofiboy', name: 'Lo-Fi Boy', url: '/avatars/lofi-boy.svg' },
		{ id: 'cybergirl', name: 'Cyber Girl', url: '/avatars/cyber-girl.svg' },
		{ id: 'cyberboy', name: 'Cyber Boy', url: '/avatars/cyber-boy.svg' },
		{ id: 'nightdev', name: 'Night Dev', url: '/avatars/night-dev.svg' },
		{ id: 'beatsguy', name: 'Beats Guy', url: '/avatars/beats-producer.svg' }
	];

	$effect(() => {
		if (open) {
			mode = initialMode;
			errorMessage = '';
			emailSent = false;
			isGoogleLoading = false;
			isEmailLoading = false;
			if (!callsign && room.name && room.name !== 'night-owl' && !room.name.startsWith('guest-')) {
				callsign = room.name;
			}
		} else {
			isGoogleLoading = false;
			isEmailLoading = false;
		}
	});

	$effect(() => {
		if (typeof window === 'undefined') return;

		const handleResetLoading = () => {
			isGoogleLoading = false;
			isEmailLoading = false;
		};

		// Reset state if browser restores from bfcache or window regains focus
		window.addEventListener('pageshow', handleResetLoading);
		window.addEventListener('focus', handleResetLoading);
		const onVisibility = () => {
			if (document.visibilityState === 'visible') handleResetLoading();
		};
		document.addEventListener('visibilitychange', onVisibility);

		// Read any OAuth error description passed in URL params or hash
		try {
			const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
			const search = window.location.search.startsWith('?') ? window.location.search.slice(1) : '';
			const params = new URLSearchParams(hash || search);
			const errDesc = params.get('error_description') || params.get('error');
			if (errDesc) {
				errorMessage = decodeURIComponent(errDesc.replace(/\+/g, ' '));
				isGoogleLoading = false;
				isEmailLoading = false;
			}
		} catch {}

		return () => {
			window.removeEventListener('pageshow', handleResetLoading);
			window.removeEventListener('focus', handleResetLoading);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	});

	function handleRandomCallsign() {
		const pool = RANDOM_CALLSIGNS.filter((c) => c !== callsign);
		callsign = pool[Math.floor(Math.random() * pool.length)];
	}

	function handleSwitchMode(newMode: 'signin' | 'signup') {
		mode = newMode;
		errorMessage = '';
		emailSent = false;
		isGoogleLoading = false;
		isEmailLoading = false;
	}

	async function handleGoogleSignIn() {
		if (loading) return;
		errorMessage = '';
		isGoogleLoading = true;

		// Safety timeout so user is never frozen if navigation is aborted or returned
		const timer = setTimeout(() => {
			isGoogleLoading = false;
		}, 7000);

		try {
			await auth.signInWithGoogle();
		} catch (err: any) {
			clearTimeout(timer);
			errorMessage = err?.message || 'Google sign-in failed. Please verify provider settings or use email.';
			isGoogleLoading = false;
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (loading) return;

		errorMessage = '';
		isEmailLoading = true;

		try {
			if (!isSupabaseConfigured) {
				throw new Error('Cloud authentication is temporarily unavailable.');
			}

			if (mode === 'signup') {
				const chosenCallsign = callsign.trim() || 'night-owl';
				const { data, error: err } = await auth.signUpWithEmail(
					email.trim(),
					password,
					chosenCallsign
				);
				if (err) throw err;

				if (data.session) {
					room.setName(chosenCallsign);
					room.setAvatar(avatarUrl);
					onSuccess();
					open = false;
				} else {
					emailSent = true;
				}
			} else {
				const { data, error: err } = await auth.signInWithEmail(email.trim(), password);
				if (err) throw err;

				if (data.user?.user_metadata?.callsign) {
					room.setName(data.user.user_metadata.callsign);
				}
				if (data.user?.user_metadata?.avatar_url) {
					room.setAvatar(data.user.user_metadata.avatar_url);
				}
				onSuccess();
				open = false;
			}
		} catch (err: any) {
			errorMessage = err?.message || 'Authentication failed. Please check your credentials.';
		} finally {
			isEmailLoading = false;
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
		class="fixed inset-0 z-[120] flex items-center justify-center bg-night/85 p-4 backdrop-blur-md overflow-y-auto"
		role="dialog"
		aria-modal="true"
		aria-labelledby="auth-modal-title"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) open = false;
		}}
	>
		<!-- Theme as before: Clean dark neutral container without gradients -->
		<div
			class="relative w-full max-w-[420px] my-auto overflow-hidden rounded-2xl border border-cream/15 bg-[#0e1315] p-6 sm:p-7 shadow-2xl text-cream animate-in fade-in zoom-in-95 duration-150"
		>
			<!-- Top Loading Shimmer Bar -->
			{#if loading}
				<div class="absolute inset-x-0 top-0 h-1 overflow-hidden bg-night-3 z-30">
					<div class="h-full bg-lamp w-full animate-pulse"></div>
				</div>
			{/if}

			<!-- Close Button -->
			<button
				type="button"
				class="absolute top-4 right-4 rounded-lg p-1.5 text-faint hover:text-cream hover:bg-cream/10 transition-colors z-20 cursor-pointer"
				onclick={() => (open = false)}
				aria-label="Close dialog"
			>
				<IconX size={18} stroke={1.5} />
			</button>

			<!-- Centered Brand Header -->
			<div class="text-center mb-5">
				<div class="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full border border-cream/15 bg-[#141c1f] text-lamp shadow-sm">
					<IconMoon size={22} stroke={1.8} />
				</div>
				<h2 id="auth-modal-title" class="text-xl font-bold tracking-tight text-cream">
					{emailSent ? 'Check your email' : mode === 'signin' ? 'Sign in to All Nighter' : 'Create your account'}
				</h2>
				<p class="mt-1 text-xs text-taupe leading-relaxed">
					{emailSent
						? 'We sent a verification link to your inbox'
						: mode === 'signin'
							? 'Welcome back! Please enter your details.'
							: 'Join the community and focus together till sunrise.'}
				</p>
			</div>

			{#if emailSent}
				<!-- Email Sent Confirmation View -->
				<div class="space-y-4">
					<div class="rounded-xl border border-cream/15 bg-[#141c1f] p-4 text-center">
						<span class="inline-grid h-10 w-10 place-items-center rounded-full bg-lamp/15 text-lamp mb-2">
							<IconMail size={20} stroke={1.8} />
						</span>
						<p class="text-sm font-semibold text-cream">Verification link sent</p>
						<p class="mt-1 text-xs text-taupe leading-relaxed">
							We sent an activation link to <span class="font-medium text-cream">{email.trim()}</span>.
						</p>
						<p class="mt-2 text-[11px] text-faint">
							Click the link to activate your account, then sign in.
						</p>
					</div>

					<button
						type="button"
						class="btn btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer rounded-lg"
						onclick={() => handleSwitchMode('signin')}
					>
						<span>Back to Sign In</span>
						<IconArrowRight size={14} stroke={2} />
					</button>
				</div>
			{:else}
				<!-- Clean Social-Style Segmented Tab Switcher -->
				<div class="grid grid-cols-2 rounded-xl bg-[#141c1f] p-1 border border-cream/10 text-xs font-medium mb-3.5">
					<button
						type="button"
						class="rounded-lg py-2 transition-all cursor-pointer text-center {mode === 'signin' ? 'bg-[#1d262a] text-cream shadow-sm font-semibold' : 'text-taupe hover:text-cream'}"
						onclick={() => handleSwitchMode('signin')}
					>
						Sign in
					</button>
					<button
						type="button"
						class="rounded-lg py-2 transition-all cursor-pointer text-center {mode === 'signup' ? 'bg-[#1d262a] text-cream shadow-sm font-semibold' : 'text-taupe hover:text-cream'}"
						onclick={() => handleSwitchMode('signup')}
					>
						Sign up
					</button>
				</div>

				<!-- One-Click Google Authentication Button -->
				<button
					type="button"
					class="w-full rounded-lg border border-cream/15 bg-[#141c1f] hover:bg-[#1a2327] hover:border-cream/30 py-2.5 px-4 text-xs font-medium text-cream flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm disabled:opacity-60"
					onclick={handleGoogleSignIn}
					disabled={loading}
				>
					{#if isGoogleLoading}
						<svg class="h-4 w-4 shrink-0 animate-spin text-lamp" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
						</svg>
						<span>Connecting to Google...</span>
					{:else}
						<svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
							<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
							<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
							<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
							<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
						</svg>
						<span>Continue with Google</span>
					{/if}
				</button>

				<!-- Divider -->
				<div class="relative my-3.5 flex items-center justify-center">
					<div class="w-full border-t border-cream/10"></div>
					<span class="absolute bg-[#0e1315] px-2.5 text-[11px] text-faint">or continue with email</span>
				</div>

				<!-- Error alert -->
				{#if errorMessage}
					<div class="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
						<IconAlertCircle size={16} stroke={2} class="shrink-0 mt-0.5 text-rose-400" />
						<span class="leading-relaxed">{errorMessage}</span>
					</div>
				{/if}

				<form class="space-y-3.5" onsubmit={handleSubmit}>
					{#if mode === 'signup'}
						<!-- Callsign Field -->
						<div>
							<div class="flex items-center justify-between mb-1.5">
								<label for="auth-callsign" class="text-xs font-medium text-cream/90">
									Callsign / Username
								</label>
								<button
									type="button"
									class="text-[11px] text-faint hover:text-lamp flex items-center gap-1 transition-colors cursor-pointer"
									onclick={handleRandomCallsign}
									title="Roll random callsign"
								>
									<IconDice size={12} stroke={1.5} />
									<span>Suggest</span>
								</button>
							</div>
							<div class="relative">
								<input
									id="auth-callsign"
									type="text"
									maxlength="24"
									required
									autocomplete="nickname"
									class="w-full rounded-lg border border-cream/15 bg-[#141c1f] px-3.5 py-2.5 text-sm text-cream outline-none focus:border-lamp focus:ring-1 focus:ring-lamp/40 transition-colors placeholder:text-faint/50"
									placeholder="e.g. midnight-coder"
									bind:value={callsign}
								/>
							</div>
						</div>

						<!-- Choose Starter Avatar (6 character avatars: 3 boys, 3 girls) -->
						<div>
							<span class="block text-xs font-medium text-cream/90 mb-1.5">
								Choose Avatar
							</span>
							<div class="grid grid-cols-6 gap-2 pt-0.5">
								{#each PRESET_AVATARS as preset}
									<button
										type="button"
										class="relative aspect-square w-full rounded-full border-2 p-0.5 transition-all cursor-pointer {avatarUrl === preset.url ? 'border-lamp ring-2 ring-lamp/30 scale-105' : 'border-cream/15 opacity-65 hover:opacity-100 hover:border-cream/40'}"
										onclick={() => (avatarUrl = preset.url)}
										title={preset.name}
									>
										<img src={preset.url} alt={preset.name} class="h-full w-full rounded-full object-cover" />
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Email Field -->
					<div>
						<label for="auth-email" class="block text-xs font-medium text-cream/90 mb-1.5">
							Email
						</label>
						<div class="relative flex items-center">
							<span class="pointer-events-none absolute left-3.5 text-faint">
								<IconMail size={16} stroke={1.5} />
							</span>
							<input
								id="auth-email"
								type="email"
								required
								autocomplete="email"
								class="w-full rounded-lg border border-cream/15 bg-[#141c1f] pl-10 pr-3.5 py-2.5 text-sm text-cream outline-none focus:border-lamp focus:ring-1 focus:ring-lamp/40 transition-colors placeholder:text-faint/50"
								placeholder="name@example.com"
								bind:value={email}
							/>
						</div>
					</div>

					<!-- Password Field -->
					<div>
						<div class="flex items-center justify-between mb-1.5">
							<label for="auth-password" class="text-xs font-medium text-cream/90">
								Password
							</label>
							{#if mode === 'signup'}
								<span class="text-[11px] text-faint">At least 6 characters</span>
							{/if}
						</div>
						<div class="relative flex items-center">
							<span class="pointer-events-none absolute left-3.5 text-faint">
								<IconLock size={16} stroke={1.5} />
							</span>
							<input
								id="auth-password"
								type={showPassword ? 'text' : 'password'}
								required
								minlength="6"
								autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
								class="w-full rounded-lg border border-cream/15 bg-[#141c1f] pl-10 pr-10 py-2.5 text-sm text-cream outline-none focus:border-lamp focus:ring-1 focus:ring-lamp/40 transition-colors placeholder:text-faint/50"
								placeholder="••••••••"
								bind:value={password}
							/>
							<button
								type="button"
								class="absolute right-2.5 text-faint hover:text-cream p-1 transition-colors cursor-pointer"
								onclick={() => (showPassword = !showPassword)}
								title={showPassword ? 'Hide password' : 'Show password'}
								aria-label={showPassword ? 'Hide password' : 'Show password'}
							>
								{#if showPassword}
									<IconEyeOff size={16} stroke={1.5} />
								{:else}
									<IconEye size={16} stroke={1.5} />
								{/if}
							</button>
						</div>
					</div>

					<!-- Submit Button -->
					<div class="pt-2">
						<button
							type="submit"
							class="btn btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer rounded-lg shadow-sm disabled:opacity-60"
							disabled={loading}
						>
							{#if isEmailLoading}
								<svg class="h-4 w-4 shrink-0 animate-spin text-night" viewBox="0 0 24 24" fill="none">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
								</svg>
								<span>{mode === 'signup' ? 'Creating account...' : 'Signing in...'}</span>
							{:else}
								<span>{mode === 'signup' ? 'Create account' : 'Sign in'}</span>
								<IconArrowRight size={15} stroke={2} />
							{/if}
						</button>
					</div>
				</form>

				<!-- Bottom Switcher: only "Sign up" and "Sign in" in orange -->
				<p class="mt-4 text-center text-xs text-taupe">
					{#if mode === 'signup'}
						Already have an account?
						<button
							type="button"
							class="font-semibold text-orange-400 hover:text-orange-300 hover:underline ml-1 cursor-pointer transition-colors"
							onclick={() => handleSwitchMode('signin')}
						>
							Sign in
						</button>
					{:else}
						Don't have an account?
						<button
							type="button"
							class="font-semibold text-orange-400 hover:text-orange-300 hover:underline ml-1 cursor-pointer transition-colors"
							onclick={() => handleSwitchMode('signup')}
						>
							Sign up
						</button>
					{/if}
				</p>
			{/if}
		</div>
	</div>
{/if}
