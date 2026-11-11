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
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconAlertCircle from '@tabler/icons-svelte/icons/alert-circle';
	import IconSparkles from '@tabler/icons-svelte/icons/sparkles';
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
			class="relative w-full max-w-[440px] my-auto overflow-hidden rounded-2xl border border-cream/20 bg-[#0a1012] p-6 sm:p-7 shadow-2xl text-cream animate-in fade-in zoom-in-95 duration-150"
		>
			<!-- Ambient background glow accents -->
			<div class="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-lamp/10 blur-3xl"></div>
			<div class="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-amber/10 blur-3xl"></div>

			<!-- Top Header -->
			<div class="flex items-start justify-between gap-3 relative z-10">
				<div class="flex items-center gap-3">
					<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-lamp/40 bg-lamp/10 text-lamp shadow-sm">
						<IconMoon size={20} stroke={1.8} />
					</span>
					<div>
						<h2 id="auth-modal-title" class="text-base sm:text-lg font-semibold text-cream leading-tight tracking-tight">
							{emailSent ? 'Check Your Inbox' : guestMode ? 'Join as Guest' : mode === 'signin' ? 'Welcome Back' : 'Create Night Account'}
						</h2>
						<p class="text-xs text-taupe mt-0.5 font-mono">
							{emailSent ? 'Confirmation link sent' : guestMode ? 'Quick temporary access' : mode === 'signin' ? 'Sync your sessions & badges' : 'Lock in till sunrise with your crew'}
						</p>
					</div>
				</div>
				<button
					type="button"
					class="rounded-lg p-1.5 text-faint hover:text-cream hover:bg-cream/10 transition-colors"
					onclick={() => (open = false)}
					aria-label="Close dialog"
				>
					<IconX size={18} stroke={1.5} />
				</button>
			</div>

			{#if emailSent}
				<!-- Email Sent Confirmation View -->
				<div class="mt-6 relative z-10 space-y-4">
					<div class="rounded-xl border border-lamp/30 bg-lamp/10 p-4 text-center">
						<span class="inline-grid h-12 w-12 place-items-center rounded-full bg-lamp/20 text-lamp mb-2">
							<IconMail size={24} stroke={1.8} />
						</span>
						<p class="text-sm font-semibold text-cream">Verification Email Sent</p>
						<p class="mt-1 text-xs text-cream/90 leading-relaxed">
							We sent a confirmation link to <span class="font-mono text-lamp font-bold">{email.trim()}</span>.
						</p>
						<p class="mt-2 text-[11px] text-taupe">
							Click the link in your email to activate your account, then come back here to sign in.
						</p>
					</div>

					<button
						type="button"
						class="btn btn-primary w-full py-2.5 text-xs font-mono font-medium flex items-center justify-center gap-2"
						onclick={() => handleSwitchMode('signin')}
					>
						<span>Back to Sign In</span>
						<IconArrowRight size={14} stroke={2} />
					</button>
				</div>
			{:else if guestMode}
				<!-- Quick Guest Mode View -->
				<form class="mt-5 relative z-10 space-y-4" onsubmit={handleGuestSubmit}>
					<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-3 text-xs text-taupe leading-relaxed">
						Guests can listen in sync and chat. To save your night logbook, badges, and hours permanently, you can create a free account at any time.
					</div>

					<div>
						<label for="guest-callsign-input" class="block text-xs font-mono uppercase tracking-wider text-faint mb-1.5">
							Your Callsign / Name
						</label>
						<div class="flex items-center gap-2">
							<input
								id="guest-callsign-input"
								type="text"
								maxlength="24"
								required
								class="w-full rounded-lg border border-cream/15 bg-night px-3.5 py-2.5 text-sm font-mono text-cream outline-none focus:border-lamp transition-colors placeholder:text-faint/50"
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
					</div>

					<div class="pt-1 flex flex-col gap-2">
						<button
							type="submit"
							class="btn btn-primary w-full py-2.5 text-xs font-mono font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md"
						>
							<span>Continue to Room</span>
							<IconArrowRight size={14} stroke={2} />
						</button>
						<button
							type="button"
							class="btn btn-ghost w-full py-2 text-xs text-taupe hover:text-cream"
							onclick={() => (guestMode = false)}
						>
							← Back to Sign In / Sign Up
						</button>
					</div>
				</form>
			{:else}
				<!-- Main Sign In / Sign Up View -->
				<div class="mt-5 relative z-10">
					<!-- Segmented Switcher Pill -->
					<div class="flex rounded-xl bg-[#060a0b] p-1 border border-cream/10 text-xs font-mono mb-4">
						<button
							type="button"
							class="flex-1 rounded-lg py-2 font-medium transition-all flex items-center justify-center gap-1.5 {mode === 'signin' ? 'bg-lamp/15 text-lamp border border-lamp/30 shadow-sm' : 'text-faint hover:text-cream'}"
							onclick={() => handleSwitchMode('signin')}
						>
							<IconUser size={13} stroke={1.8} />
							<span>Sign In</span>
						</button>
						<button
							type="button"
							class="flex-1 rounded-lg py-2 font-medium transition-all flex items-center justify-center gap-1.5 {mode === 'signup' ? 'bg-amber/15 text-amber border border-amber/30 shadow-sm' : 'text-faint hover:text-cream'}"
							onclick={() => handleSwitchMode('signup')}
						>
							<IconSparkles size={13} stroke={1.8} />
							<span>Create Account</span>
						</button>
					</div>

					<!-- Error alert -->
					{#if errorMessage}
						<div class="mb-4 rounded-xl border border-ruby/30 bg-ruby/10 p-3 text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
							<IconAlertCircle size={16} stroke={2} class="shrink-0 mt-0.5 text-ruby" />
							<span class="leading-relaxed">{errorMessage}</span>
						</div>
					{/if}

					<form class="space-y-3.5" onsubmit={handleSubmit}>
						{#if mode === 'signup'}
							<!-- Callsign Field -->
							<div>
								<div class="flex items-center justify-between mb-1.5">
									<label for="auth-callsign" class="text-xs font-mono uppercase tracking-wider text-faint">
										Callsign / Night Name <span class="text-amber">*</span>
									</label>
									<button
										type="button"
										class="text-[11px] font-mono text-faint hover:text-lamp flex items-center gap-1 transition-colors cursor-pointer"
										onclick={handleRandomCallsign}
										title="Roll random callsign"
									>
										<IconDice size={12} stroke={1.5} />
										<span>Randomize</span>
									</button>
								</div>
								<div class="relative">
									<input
										id="auth-callsign"
										type="text"
										maxlength="24"
										required
										autocomplete="nickname"
										class="w-full rounded-lg border border-cream/15 bg-night px-3.5 py-2.5 text-xs font-mono text-cream outline-none focus:border-lamp transition-colors placeholder:text-faint/50"
										placeholder="e.g. midnight-coder"
										bind:value={callsign}
									/>
								</div>
								<p class="mt-1 text-[10px] text-faint">Your callsign appears on the queue and presence roster.</p>
							</div>

							<!-- Choose Starter Avatar -->
							<div>
								<span class="block text-xs font-mono uppercase tracking-wider text-faint mb-2">
									Starter Avatar
								</span>
								<div class="grid grid-cols-4 gap-2">
									{#each PRESET_AVATARS as preset}
										<button
											type="button"
											class="flex flex-col items-center gap-1 rounded-xl border p-1.5 transition-all {avatarUrl === preset.url ? 'border-lamp bg-lamp/15 scale-105 shadow-sm' : 'border-cream/10 bg-[#060a0b] hover:border-cream/20'}"
											onclick={() => (avatarUrl = preset.url)}
											title={preset.name}
										>
											<img src={preset.url} alt={preset.name} class="h-8 w-8 rounded-full object-cover" />
											<span class="text-[9px] font-mono text-taupe truncate w-full text-center">{preset.name}</span>
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Email Field -->
						<div>
							<label for="auth-email" class="block text-xs font-mono uppercase tracking-wider text-faint mb-1.5">
								Email Address <span class="text-amber">*</span>
							</label>
							<div class="relative flex items-center">
								<span class="pointer-events-none absolute left-3.5 text-faint">
									<IconMail size={15} stroke={1.5} />
								</span>
								<input
									id="auth-email"
									type="email"
									required
									autocomplete="email"
									class="w-full rounded-lg border border-cream/15 bg-night pl-9 pr-3.5 py-2.5 text-xs font-mono text-cream outline-none focus:border-lamp transition-colors placeholder:text-faint/50"
									placeholder="name@domain.com"
									bind:value={email}
								/>
							</div>
						</div>

						<!-- Password Field -->
						<div>
							<div class="flex items-center justify-between mb-1.5">
								<label for="auth-password" class="text-xs font-mono uppercase tracking-wider text-faint">
									Password <span class="text-amber">*</span>
								</label>
								{#if mode === 'signup'}
									<span class="text-[10px] font-mono text-faint">min 6 chars</span>
								{/if}
							</div>
							<div class="relative flex items-center">
								<span class="pointer-events-none absolute left-3.5 text-faint">
									<IconLock size={15} stroke={1.5} />
								</span>
								<input
									id="auth-password"
									type={showPassword ? 'text' : 'password'}
									required
									minlength="6"
									autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
									class="w-full rounded-lg border border-cream/15 bg-night pl-9 pr-10 py-2.5 text-xs font-mono text-cream outline-none focus:border-lamp transition-colors placeholder:text-faint/50"
									placeholder="••••••••"
									bind:value={password}
								/>
								<button
									type="button"
									class="absolute right-2.5 text-faint hover:text-cream p-1 transition-colors"
									onclick={() => (showPassword = !showPassword)}
									title={showPassword ? 'Hide password' : 'Show password'}
									aria-label={showPassword ? 'Hide password' : 'Show password'}
								>
									{#if showPassword}
										<IconEyeOff size={15} stroke={1.5} />
									{:else}
										<IconEye size={15} stroke={1.5} />
									{/if}
								</button>
							</div>
						</div>

						<!-- Submit Button -->
						<div class="pt-2">
							<button
								type="submit"
								class="btn w-full py-2.5 text-xs font-mono font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.01] {mode === 'signup' ? 'btn-amber' : 'btn-primary'}"
								disabled={loading}
							>
								{#if loading}
									<span class="soft-blink h-2 w-2 rounded-full bg-night"></span>
									<span>{mode === 'signup' ? 'Creating Account...' : 'Signing in...'}</span>
								{:else}
									<span>{mode === 'signup' ? 'Create Nocturnal Account' : 'Sign In to All Nighter'}</span>
									<IconArrowRight size={14} stroke={2} />
								{/if}
							</button>
						</div>
					</form>

					<!-- Bottom Guest & Footer Switcher -->
					<div class="mt-4 pt-3 border-t border-cream/10 flex flex-col items-center gap-2 text-xs">
						<p class="text-taupe text-center">
							{mode === 'signup' ? 'Already have an account?' : 'First night here?'}
							<button
								type="button"
								class="text-lamp hover:underline font-medium ml-1 cursor-pointer"
								onclick={() => handleSwitchMode(mode === 'signup' ? 'signin' : 'signup')}
							>
								{mode === 'signup' ? 'Sign In instead' : 'Create an account'}
							</button>
						</p>

						{#if allowGuest}
							<button
								type="button"
								class="text-faint hover:text-cream text-[11px] font-mono transition-colors mt-0.5"
								onclick={() => (guestMode = true)}
							>
								Or continue as guest (no account) →
							</button>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
