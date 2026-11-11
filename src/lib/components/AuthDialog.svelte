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
	let loading = $state(false);
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
			if (!callsign && room.name && room.name !== 'night-owl' && !room.name.startsWith('guest-')) {
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
