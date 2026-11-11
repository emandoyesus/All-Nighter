<script lang="ts">
	import { auth } from '#lib/auth.svelte';
	import { room } from '#lib/room/room.svelte';
	import { isSupabaseConfigured } from '#lib/supabase';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconMail from '@tabler/icons-svelte/icons/mail';
	import IconLock from '@tabler/icons-svelte/icons/lock';
	import IconEye from '@tabler/icons-svelte/icons/eye';
	import IconEyeOff from '@tabler/icons-svelte/icons/eye-off';
	import IconDice from '@tabler/icons-svelte/icons/dice';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconSparkles from '@tabler/icons-svelte/icons/sparkles';
	import IconUser from '@tabler/icons-svelte/icons/user';
	import IconAlertCircle from '@tabler/icons-svelte/icons/alert-circle';
	import IconArrowRight from '@tabler/icons-svelte/icons/arrow-right';

	let isSignUp = $state(false);
	let email = $state('');
	let password = $state('');
	let callsign = $state(room.name || '');
	let avatarUrl = $state('/avatars/lofi-girl.svg');
	let showPassword = $state(false);
	let loading = $state(false);
	let error = $state('');
	let emailSent = $state(false);
	let guestMode = $state(false);
	let guestCallsign = $state(room.name || 'night-owl');

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

	function handleRandomCallsign() {
		const pool = RANDOM_CALLSIGNS.filter((c) => c !== callsign);
		callsign = pool[Math.floor(Math.random() * pool.length)];
	}

	function handleSwitchMode(signup: boolean) {
		isSignUp = signup;
		error = '';
		emailSent = false;
		guestMode = false;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (loading) return;
		error = '';
		loading = true;

		try {
			if (!isSupabaseConfigured) {
				throw new Error('Cloud authentication is temporarily unavailable.');
			}

			if (isSignUp) {
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
					// Re-trigger room check if URL has room param
					room.init();
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
				room.init();
			}
		} catch (err: any) {
			error = err?.message || 'Authentication failed. Please check your credentials.';
		} finally {
			loading = false;
		}
	}

	function handleGuestContinue(e: SubmitEvent) {
		e.preventDefault();
		const name = guestCallsign.trim() || 'night-owl';
		auth.continueAsGuest(name);
		room.setName(name);
		room.init();
	}
</script>

<div class="mx-auto max-w-md w-full">
	<div
		class="relative overflow-hidden rounded-2xl border border-cream/20 bg-[#0a1012] p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-cream"
	>
		<!-- Ambient atmospheric lights -->
		<div class="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-lamp/10 blur-3xl"></div>
		<div class="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-amber/10 blur-3xl"></div>

		<!-- Card Header -->
		<div class="text-center relative z-10">
			<span class="inline-grid h-12 w-12 place-items-center rounded-2xl border border-lamp/40 bg-lamp/10 text-lamp mb-3 shadow-sm">
				<IconMoon size={24} stroke={1.8} />
			</span>
			<h2 class="text-xl sm:text-2xl font-bold tracking-tight text-cream">
				{emailSent ? 'Check Your Inbox' : guestMode ? 'Enter Room as Guest' : isSignUp ? 'Join the Night Crew' : 'Sign In to Enter'}
			</h2>
			<p class="mt-1.5 text-xs text-taupe leading-relaxed">
				{emailSent ? 'Confirmation link sent to your email' : guestMode ? 'Quick access without cloud sync' : 'Synchronized audio, collaborative queue, and focus room presence.'}
			</p>
		</div>

		{#if emailSent}
			<!-- Email Sent State -->
			<div class="mt-6 relative z-10 space-y-4">
				<div class="rounded-xl border border-lamp/30 bg-lamp/10 p-4 text-center">
					<span class="inline-grid h-10 w-10 place-items-center rounded-full bg-lamp/20 text-lamp mb-2">
						<IconMail size={20} stroke={1.8} />
					</span>
					<p class="text-xs text-cream/90 leading-relaxed">
						We sent a verification link to <span class="font-mono text-lamp font-bold">{email.trim()}</span>.
					</p>
					<p class="mt-2 text-[11px] text-taupe">
						Follow the link in your email to confirm your account, then sign in below.
					</p>
				</div>
				<button
					type="button"
					class="btn btn-primary w-full py-2.5 text-xs font-mono font-medium flex items-center justify-center gap-2"
					onclick={() => handleSwitchMode(false)}
				>
					<span>Back to Sign In</span>
					<IconArrowRight size={14} stroke={2} />
				</button>
			</div>
		{:else if guestMode}
			<!-- Guest Mode Form -->
			<form class="mt-6 relative z-10 space-y-4" onsubmit={handleGuestContinue}>
				<div class="rounded-xl border border-cream/10 bg-[#060a0b] p-3 text-xs text-taupe leading-relaxed">
					Joining as a guest gives you full access to the live audio stream, chat, and room queue. You can upgrade to a cloud account anytime.
				</div>

				<div>
					<label for="room-guest-callsign" class="block font-mono text-[11px] uppercase tracking-wider text-faint mb-1.5">
						Your Callsign / Name
					</label>
					<div class="flex items-center gap-2">
						<input
							id="room-guest-callsign"
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

				<div class="pt-2 flex flex-col gap-2">
					<button
						type="submit"
						class="btn btn-primary w-full py-2.5 text-xs font-mono font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md"
					>
						<span>Enter Room as Guest</span>
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
			<!-- Main Auth Form -->
			<div class="mt-6 relative z-10">
				<!-- Segmented Switcher Pill -->
				<div class="flex rounded-xl bg-[#060a0b] p-1 border border-cream/10 text-xs font-mono mb-4">
					<button
						type="button"
						class="flex-1 rounded-lg py-2 font-medium transition-all flex items-center justify-center gap-1.5 {!isSignUp ? 'bg-lamp/15 text-lamp border border-lamp/30 shadow-sm' : 'text-faint hover:text-cream'}"
						onclick={() => handleSwitchMode(false)}
					>
						<IconUser size={13} stroke={1.8} />
						<span>Sign In</span>
					</button>
					<button
						type="button"
						class="flex-1 rounded-lg py-2 font-medium transition-all flex items-center justify-center gap-1.5 {isSignUp ? 'bg-amber/15 text-amber border border-amber/30 shadow-sm' : 'text-faint hover:text-cream'}"
						onclick={() => handleSwitchMode(true)}
					>
						<IconSparkles size={13} stroke={1.8} />
						<span>Create Account</span>
					</button>
				</div>

				{#if error}
					<div class="mb-4 rounded-xl border border-ruby/30 bg-ruby/10 p-3 text-xs text-rose-300 flex items-start gap-2">
						<IconAlertCircle size={16} stroke={2} class="shrink-0 mt-0.5 text-ruby" />
						<span class="leading-relaxed">{error}</span>
					</div>
				{/if}

				<form class="space-y-3.5" onsubmit={handleSubmit}>
					{#if isSignUp}
						<!-- Callsign Field -->
						<div>
							<div class="flex items-center justify-between mb-1.5">
								<label for="room-signup-callsign" class="text-xs font-mono uppercase tracking-wider text-faint">
									Callsign <span class="text-amber">*</span>
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
							<input
								id="room-signup-callsign"
								type="text"
								maxlength="24"
								required
								autocomplete="nickname"
								class="w-full rounded-lg border border-cream/15 bg-night px-3.5 py-2.5 text-xs font-mono text-cream outline-none focus:border-lamp transition-colors placeholder:text-faint/50"
								placeholder="e.g. solomon"
								bind:value={callsign}
							/>
						</div>

						<!-- Starter Avatar Selection -->
						<div>
							<span class="block text-xs font-mono uppercase tracking-wider text-faint mb-2">
								Choose Avatar
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

					<!-- Email Address -->
					<div>
						<label for="room-auth-email" class="block text-xs font-mono uppercase tracking-wider text-faint mb-1.5">
							Email Address <span class="text-amber">*</span>
						</label>
						<div class="relative flex items-center">
							<span class="pointer-events-none absolute left-3.5 text-faint">
								<IconMail size={15} stroke={1.5} />
							</span>
							<input
								id="room-auth-email"
								type="email"
								required
								autocomplete="email"
								class="w-full rounded-lg border border-cream/15 bg-night pl-9 pr-3.5 py-2.5 text-xs font-mono text-cream outline-none focus:border-lamp transition-colors placeholder:text-faint/50"
								placeholder="you@example.com"
								bind:value={email}
							/>
						</div>
					</div>

					<!-- Password -->
					<div>
						<div class="flex items-center justify-between mb-1.5">
							<label for="room-auth-password" class="text-xs font-mono uppercase tracking-wider text-faint">
								Password <span class="text-amber">*</span>
							</label>
							{#if isSignUp}
								<span class="text-[10px] font-mono text-faint">min 6 chars</span>
							{/if}
						</div>
						<div class="relative flex items-center">
							<span class="pointer-events-none absolute left-3.5 text-faint">
								<IconLock size={15} stroke={1.5} />
							</span>
							<input
								id="room-auth-password"
								type={showPassword ? 'text' : 'password'}
								required
								minlength="6"
								autocomplete={isSignUp ? 'new-password' : 'current-password'}
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
							class="btn w-full py-2.5 text-xs font-mono font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.01] {isSignUp ? 'btn-amber' : 'btn-primary'}"
							disabled={loading}
						>
							{#if loading}
								<span class="soft-blink h-2 w-2 rounded-full bg-night"></span>
								<span>{isSignUp ? 'Creating Account...' : 'Connecting...'}</span>
							{:else}
								<span>{isSignUp ? 'Create Account & Enter' : 'Sign In & Enter'}</span>
								<IconArrowRight size={14} stroke={2} />
							{/if}
						</button>
					</div>
				</form>

				<!-- Footer switcher & Guest link -->
				<div class="mt-4 pt-3 border-t border-cream/10 flex flex-col items-center gap-2 text-xs">
					<p class="text-taupe text-center">
						{isSignUp ? 'Already have an account?' : 'First night here?'}
						<button
							type="button"
							class="text-lamp hover:underline font-medium ml-1 cursor-pointer"
							onclick={() => handleSwitchMode(!isSignUp)}
						>
							{isSignUp ? 'Sign In instead' : 'Create an account'}
						</button>
					</p>

					<button
						type="button"
						class="text-faint hover:text-cream text-[11px] font-mono transition-colors mt-0.5"
						onclick={() => (guestMode = true)}
					>
						Or continue as guest (enter without account) →
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
