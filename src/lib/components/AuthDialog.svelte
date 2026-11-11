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
	import IconUser from '@tabler/icons-svelte/icons/user';
	import IconArrowRight from '@tabler/icons-svelte/icons/arrow-right';

	let {
		open = $bindable(false),
		initialMode = 'signin',
		allowGuest = true,
		onSuccess = () => {},
		onGuestContinue = () => {}
	}: {
		open?: boolean;
		initialMode?: 'signin' | 'signup';
		allowGuest?: boolean;
		onSuccess?: () => void;
		onGuestContinue?: (callsign: string) => void;
	} = $props();

	let mode = $state<'signin' | 'signup'>('signin');
	let email = $state('');
	let password = $state('');
	let callsign = $state('');
	let avatarUrl = $state('/avatars/lofi-girl.svg');
	let showPassword = $state(false);
	let loading = $state(false);
	let errorMessage = $state('');
	let emailSent = $state(false);
	let guestMode = $state(false);
	let guestCallsign = $state(room.name || '');

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

	const PRESET_AVATARS = [
		{ id: 'lofigirl', name: 'Lo-Fi Girl', url: '/avatars/lofi-girl.svg' },
		{ id: 'lofiboy', name: 'Lo-Fi Boy', url: '/avatars/lofi-boy.svg' },
		{ id: 'cybergirl', name: 'Cyber Girl', url: '/avatars/cyber-girl.svg' },
		{ id: 'cyberboy', name: 'Cyber Boy', url: '/avatars/cyber-boy.svg' },
		{ id: 'nightdev', name: 'Night Dev', url: '/avatars/night-dev.svg' },
		{ id: 'beatsguy', name: 'Beats Guy', url: '/avatars/beats-producer.svg' },
		{ id: 'owl', name: 'Night Owl', url: '/avatars/owl.svg' },
		{ id: 'cassette', name: 'Analog Tape', url: '/avatars/cassette.svg' },
		{ id: 'vinyl', name: 'Vinyl Record', url: '/avatars/vinyl.svg' },
		{ id: 'coffee', name: 'Espresso Mug', url: '/avatars/coffee.svg' },
		{ id: 'moon', name: 'Midnight Moon', url: '/avatars/moon.svg' },
		{ id: 'saturn', name: 'Saturn Ring', url: '/avatars/saturn.svg' }
	];

	$effect(() => {
		if (open) {
			mode = initialMode;
			errorMessage = '';
			emailSent = false;
			guestMode = false;
			if (!callsign && room.name && room.name !== 'night-owl') {
				callsign = room.name;
			}
		}
	});

	function handleRandomCallsign() {
		const pool = RANDOM_CALLSIGNS.filter((c) => c !== callsign);
		callsign = pool[Math.floor(Math.random() * pool.length)];
	}

	function handleSwitchMode(newMode: 'signin' | 'signup') {
		mode = newMode;
		errorMessage = '';
		emailSent = false;
		guestMode = false;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (loading) return;

		errorMessage = '';
		loading = true;

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
					// Supabase confirmation email required
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
			loading = false;
		}
	}

	function handleGuestSubmit(e: SubmitEvent) {
		e.preventDefault();
		const name = guestCallsign.trim() || 'night-owl';
		room.setName(name);
		onGuestContinue(name);
		open = false;
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
		<div
			class="relative w-full max-w-[420px] my-auto overflow-hidden rounded-2xl border border-cream/15 bg-[#0e1315] p-6 sm:p-7 shadow-2xl text-cream animate-in fade-in zoom-in-95 duration-150"
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

			<!-- Centered Brand Header -->
			<div class="text-center mb-5">
				<div class="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full border border-cream/15 bg-[#141c1f] text-lamp shadow-sm">
					<IconMoon size={22} stroke={1.8} />
				</div>
				<h2 id="auth-modal-title" class="text-xl font-bold tracking-tight text-cream">
					{emailSent ? 'Check your email' : guestMode ? 'Continue as guest' : mode === 'signin' ? 'Sign in to All Nighter' : 'Create your account'}
				</h2>
				<p class="mt-1 text-xs text-taupe leading-relaxed">
					{emailSent
						? 'We sent a verification link to your inbox'
						: guestMode
							? 'Join the room instantly without creating an account'
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
			{:else if guestMode}
				<!-- Guest Mode View -->
				<form class="space-y-4" onsubmit={handleGuestSubmit}>
					<div>
						<label for="guest-callsign-input" class="block text-xs font-medium text-cream/90 mb-1.5">
							Callsign / Display Name
						</label>
						<div class="flex items-center gap-2">
							<input
								id="guest-callsign-input"
								type="text"
								maxlength="24"
								required
								class="w-full rounded-lg border border-cream/15 bg-[#141c1f] px-3.5 py-2.5 text-sm text-cream outline-none focus:border-lamp focus:ring-1 focus:ring-lamp/40 transition-colors placeholder:text-faint/50"
								placeholder="e.g. night-owl"
								bind:value={guestCallsign}
							/>
							<button
								type="button"
								class="btn btn-ghost btn-sm px-2.5 py-2.5 shrink-0 border border-cream/15 hover:border-lamp hover:text-lamp transition-colors"
								onclick={() => {
									const pool = RANDOM_CALLSIGNS.filter((c) => c !== guestCallsign);
									guestCallsign = pool[Math.floor(Math.random() * pool.length)];
								}}
								title="Roll random callsign"
							>
								<IconDice size={16} stroke={1.5} />
							</button>
						</div>
						<p class="mt-1 text-[11px] text-faint">
							Guests can listen to music and chat. Create an account anytime to save your hours permanently.
						</p>
					</div>

					<div class="pt-1 flex flex-col gap-2">
						<button
							type="submit"
							class="btn btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md rounded-lg"
						>
							<span>Enter Room as Guest</span>
							<IconArrowRight size={14} stroke={2} />
						</button>
						<button
							type="button"
							class="btn btn-ghost w-full py-2 text-xs text-taupe hover:text-cream cursor-pointer"
							onclick={() => (guestMode = false)}
						>
							← Back to Sign In
						</button>
					</div>
				</form>
			{:else}
				<!-- Clean Social-Style Segmented Tab Switcher -->
				<div class="grid grid-cols-2 rounded-xl bg-[#141c1f] p-1 border border-cream/10 text-xs font-medium mb-4">
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

						<!-- Choose Starter Avatar -->
						<div>
							<span class="block text-xs font-medium text-cream/90 mb-1.5">
								Choose Avatar
							</span>
							<div class="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
								{#each PRESET_AVATARS as preset}
									<button
										type="button"
										class="relative h-10 w-10 shrink-0 rounded-full border-2 p-0.5 transition-all cursor-pointer {avatarUrl === preset.url ? 'border-lamp ring-2 ring-lamp/25 scale-105' : 'border-cream/15 opacity-65 hover:opacity-100 hover:border-cream/40'}"
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
							class="btn btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer rounded-lg shadow-sm"
							disabled={loading}
						>
							{#if loading}
								<span class="soft-blink h-2 w-2 rounded-full bg-night"></span>
								<span>{mode === 'signup' ? 'Creating account...' : 'Signing in...'}</span>
							{:else}
								<span>{mode === 'signup' ? 'Create account' : 'Sign in'}</span>
								<IconArrowRight size={15} stroke={2} />
							{/if}
						</button>
					</div>
				</form>

				{#if allowGuest}
					<!-- Social Media Style Divider -->
					<div class="relative my-4 flex items-center justify-center">
						<div class="w-full border-t border-cream/10"></div>
						<span class="absolute bg-[#0e1315] px-3 text-xs text-faint uppercase tracking-wider">or</span>
					</div>

					<!-- Secondary Guest Action -->
					<button
						type="button"
						class="w-full rounded-lg border border-cream/15 bg-[#141c1f] py-2.5 text-xs font-medium text-cream hover:bg-[#1a2327] hover:border-cream/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
						onclick={() => (guestMode = true)}
					>
						<IconUser size={15} stroke={1.75} class="text-taupe" />
						<span>Continue as guest</span>
					</button>
				{/if}

				<!-- Bottom Switcher -->
				<p class="mt-4 text-center text-xs text-taupe">
					{mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
					<button
						type="button"
						class="font-semibold text-lamp hover:underline ml-1 cursor-pointer"
						onclick={() => handleSwitchMode(mode === 'signup' ? 'signin' : 'signup')}
					>
						{mode === 'signup' ? 'Sign in' : 'Sign up'}
					</button>
				</p>
			{/if}
		</div>
	</div>
{/if}
