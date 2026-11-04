<script lang="ts">
	import { auth } from '#lib/auth.svelte';
	import { isSupabaseConfigured } from '#lib/supabase';
	import { room } from '#lib/room/room.svelte';
	import IconUser from '@tabler/icons-svelte/icons/user';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconLogout from '@tabler/icons-svelte/icons/logout';

	let open = $state(false);
	let isSignUp = $state(false);
	let email = $state('');
	let password = $state('');
	let callsign = $state('');
	let error = $state('');
	let loading = $state(false);
	let successMsg = $state('');
	let avatarInput = $state('');
	let savingAvatar = $state(false);
	let avatarMsg = $state('');
	let imgError = $state(false);

	$effect(() => {
		if (auth.user) {
			avatarInput = auth.avatarUrl || '';
			imgError = false;
		}
	});

	async function handleSaveAvatar() {
		savingAvatar = true;
		avatarMsg = '';
		try {
			await auth.updateProfile({ avatarUrl: avatarInput.trim() });
			avatarMsg = 'Saved!';
			imgError = false;
			setTimeout(() => {
				avatarMsg = '';
			}, 2500);
		} catch (err: any) {
			avatarMsg = 'Failed to save';
		} finally {
			savingAvatar = false;
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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		successMsg = '';
		loading = true;

		try {
			if (isSignUp) {
				const { data, error: err } = await auth.signUpWithEmail(email, password, callsign || room.name);
				if (err) throw err;
				if (data.session) {
					successMsg = 'Account created!';
					if (callsign) room.setName(callsign);
					open = false;
				} else {
					successMsg = 'Confirmation link sent to your email!';
				}
			} else {
				const { data, error: err } = await auth.signInWithEmail(email, password);
				if (err) throw err;
				if (data.user?.user_metadata?.callsign) {
					room.setName(data.user.user_metadata.callsign);
				}
				open = false;
			}
		} catch (err: any) {
			error = err?.message || 'Authentication failed';
		} finally {
			loading = false;
		}
	}

	async function handleSignOut() {
		await auth.signOut();
		open = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isSupabaseConfigured}
	<div class="relative" use:clickOutside={() => (open = false)}>
		{#if auth.isAuthenticated}
			<!-- Authenticated user icon -->
			<button
				class="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-lamp/40 bg-night-2 transition-all hover:border-lamp active:scale-95 p-0 overflow-hidden"
				onclick={() => (open = !open)}
				title="{auth.displayName} ({auth.user?.email || 'Profile'})"
				aria-label="Account profile ({auth.displayName})"
				aria-expanded={open}
			>
				<img
					src={!imgError && auth.avatarUrl ? auth.avatarUrl : '/default-avatar.svg'}
					alt={auth.displayName || 'Profile'}
					class="h-full w-full rounded-full object-cover"
					onerror={() => (imgError = true)}
				/>
				<span class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-lamp border-2 border-night"></span>
			</button>

			<!-- Profile Dropdown (anchored to top-right icon, opens downwards into page) -->
			{#if open}
				<div
					class="absolute right-0 top-full mt-2.5 z-50 w-72 sm:w-80 rounded-card border border-cream/15 bg-night-2 p-4 shadow-2xl backdrop-blur-xl"
					role="dialog"
					aria-label="Account Profile"
				>
					<div class="flex items-center justify-between pb-3 border-b border-cream/10">
						<div class="flex items-center gap-2.5 min-w-0">
							<img
								src={!imgError && auth.avatarUrl ? auth.avatarUrl : '/default-avatar.svg'}
								alt={auth.displayName || 'Profile'}
								class="h-9 w-9 shrink-0 rounded-full object-cover border border-lamp/30 bg-night"
								onerror={() => (imgError = true)}
							/>
							<div class="min-w-0">
								<p class="truncate text-xs font-semibold text-cream">{auth.displayName || 'All-Nighter'}</p>
								<p class="truncate text-[11px] text-faint">{auth.user?.email}</p>
							</div>
						</div>
						<button
							type="button"
							class="rounded p-1 text-faint hover:text-cream hover:bg-cream/5"
							onclick={() => (open = false)}
							aria-label="Close"
						>
							<IconX size={15} stroke={1.5} />
						</button>
					</div>

					<div class="mt-3 space-y-2.5 text-xs">
						<div class="rounded-lg bg-night/60 p-2.5 border border-cream/5">
							<p class="text-[10px] uppercase font-mono tracking-wider text-faint">Room Callsign</p>
							<p class="font-mono text-sm text-lamp font-medium mt-0.5">{auth.displayName}</p>
						</div>
						<div class="rounded-lg bg-night/60 p-2.5 border border-cream/5">
							<p class="text-[10px] uppercase font-mono tracking-wider text-faint">Logged In Email</p>
							<p class="text-xs text-cream/90 truncate mt-0.5">{auth.user?.email}</p>
						</div>
						<div class="rounded-lg bg-night/60 p-2.5 border border-cream/5">
							<div class="flex items-center justify-between mb-1">
								<p class="text-[10px] uppercase font-mono tracking-wider text-faint">Profile Picture URL</p>
								{#if avatarMsg}
									<span class="text-[10px] text-lamp font-mono">{avatarMsg}</span>
								{/if}
							</div>
							<div class="flex items-center gap-1.5">
								<input
									type="url"
									class="w-full rounded border border-cream/15 bg-night px-2.5 py-1 text-xs text-cream outline-none focus:border-lamp font-mono placeholder:text-faint/60"
									placeholder="Image URL (optional)"
									bind:value={avatarInput}
								/>
								<button
									type="button"
									class="btn btn-primary btn-sm text-[11px] px-2.5 py-1 shrink-0"
									disabled={savingAvatar}
									onclick={handleSaveAvatar}
								>
									{savingAvatar ? 'Saving...' : 'Save'}
								</button>
							</div>
						</div>

						<div class="pt-2 flex justify-between items-center gap-2">
							<button
								type="button"
								class="btn btn-ghost btn-sm text-xs flex-1 border border-cream/10 hover:border-ruby/40 hover:text-rose-300"
								onclick={handleSignOut}
							>
								<IconLogout size={14} stroke={1.5} />
								Sign Out
							</button>
							<button
								type="button"
								class="btn btn-primary btn-sm text-xs px-4"
								onclick={() => (open = false)}
							>
								Done
							</button>
						</div>
					</div>
				</div>
			{/if}
		{:else}
			<!-- Unauthenticated trigger icon -->
			<button
				class="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-cream/20 bg-night-2 transition-all hover:border-cream/40 active:scale-95 p-0 overflow-hidden"
				onclick={() => {
					open = true;
					callsign = room.name;
				}}
				title="Sign in / Profile"
				aria-label="Sign in"
			>
				<img
					src="/default-avatar.svg"
					alt="Profile"
					class="h-full w-full rounded-full object-cover opacity-85 transition-opacity hover:opacity-100"
				/>
			</button>

			<!-- Sign In / Sign Up Modal portaled to document.body so header CSS transform does not clip it -->
			{#if open}
				<div
					use:portal
					class="fixed inset-x-0 bottom-0 top-16 md:top-[68px] z-40 flex items-center justify-center bg-night/85 p-4 backdrop-blur-md overflow-y-auto"
					role="dialog"
					aria-modal="true"
				>
					<div
						class="relative w-full max-w-sm rounded-card border border-cream/15 bg-night-2 p-6 shadow-2xl my-auto"
						use:clickOutside={() => (open = false)}
					>
						<div class="flex items-center justify-between pb-3 border-b border-cream/10">
							<h3 class="text-base font-semibold text-cream">
								{isSignUp ? 'Create Callsign Account' : 'Sign In to All-Nighter'}
							</h3>
							<button class="icon-btn text-faint hover:text-cream" onclick={() => (open = false)} aria-label="Close">
								<IconX size={16} stroke={1.5} />
							</button>
						</div>

						<form class="mt-4 space-y-3" onsubmit={handleSubmit}>
							{#if error}
								<div class="rounded-sm border border-ruby/30 bg-ruby/10 p-2 text-xs text-rose-300">
									{error}
								</div>
							{/if}
							{#if successMsg}
								<div class="rounded-sm border border-lamp/30 bg-lamp/10 p-2 text-xs text-lamp">
									{successMsg}
								</div>
							{/if}

							{#if isSignUp}
								<div>
									<label for="callsign" class="block text-[11px] font-mono text-faint uppercase mb-1">Callsign</label>
									<input
										id="callsign"
										type="text"
										class="w-full rounded border border-cream/15 bg-night px-3 py-1.5 text-xs text-cream outline-none focus:border-lamp font-mono"
										placeholder="e.g. solomon"
										bind:value={callsign}
									/>
								</div>
							{/if}

							<div>
								<label for="email" class="block text-[11px] font-mono text-faint uppercase mb-1">Email</label>
								<input
									id="email"
									type="email"
									required
									class="w-full rounded border border-cream/15 bg-night px-3 py-1.5 text-xs text-cream outline-none focus:border-lamp font-mono"
									placeholder="you@example.com"
									bind:value={email}
								/>
							</div>

							<div>
								<label for="password" class="block text-[11px] font-mono text-faint uppercase mb-1">Password</label>
								<input
									id="password"
									type="password"
									required
									minlength="6"
									class="w-full rounded border border-cream/15 bg-night px-3 py-1.5 text-xs text-cream outline-none focus:border-lamp font-mono"
									bind:value={password}
								/>
							</div>

							<button type="submit" class="btn btn-primary w-full text-xs mt-2" disabled={loading}>
								{loading ? 'Connecting...' : isSignUp ? 'Create Account' : 'Sign In'}
							</button>

							<div class="pt-2 text-center text-xs text-faint">
								<button
									type="button"
									class="text-lamp hover:underline"
									onclick={() => {
										isSignUp = !isSignUp;
										error = '';
									}}
								>
									{isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
								</button>
							</div>
						</form>
					</div>
				</div>
			{/if}
		{/if}
	</div>
{/if}
