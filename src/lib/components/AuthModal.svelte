<script lang="ts">
	import { auth } from '#lib/auth.svelte';
	import { isSupabaseConfigured } from '#lib/supabase';
	import { room } from '#lib/room/room.svelte';
	import IconUser from '@tabler/icons-svelte/icons/user';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconLogout from '@tabler/icons-svelte/icons/logout';
	import IconKey from '@tabler/icons-svelte/icons/key';

	let open = $state(false);
	let isSignUp = $state(false);
	let email = $state('');
	let password = $state('');
	let callsign = $state('');
	let error = $state('');
	let loading = $state(false);
	let successMsg = $state('');

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

<!-- Account status trigger button in Nav / Room -->
{#if isSupabaseConfigured}
	{#if auth.isAuthenticated}
		<button
			class="inline-flex items-center gap-1.5 rounded-full border border-lamp/30 bg-lamp/10 px-2.5 py-1 text-xs font-mono text-lamp hover:border-lamp transition-colors"
			onclick={() => (open = true)}
			title="Account settings"
		>
			<IconUser size={13} stroke={2} />
			<span class="max-w-[100px] truncate">{auth.displayName}</span>
		</button>
	{:else}
		<button
			class="inline-flex items-center gap-1.5 rounded-full border border-cream/15 bg-night/80 px-2.5 py-1 text-xs font-mono text-faint hover:text-cream hover:border-cream/30 transition-colors"
			onclick={() => {
				open = true;
				callsign = room.name;
			}}
			title="Sign in or link account"
		>
			<IconKey size={13} stroke={1.5} />
			<span class="hidden sm:inline">Sign in</span>
		</button>
	{/if}
{/if}

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
	>
		<div class="relative w-full max-w-sm rounded-card border border-cream/15 bg-night-2 p-6 shadow-2xl">
			<div class="flex items-center justify-between pb-3 border-b border-cream/10">
				<h3 class="text-base font-semibold text-cream">
					{#if auth.isAuthenticated}
						Account Profile
					{:else}
						{isSignUp ? 'Create Night-Owl Account' : 'Sign In to All-Nighter'}
					{/if}
				</h3>
				<button class="icon-btn text-faint hover:text-cream" onclick={() => (open = false)} aria-label="Close">
					<IconX size={16} stroke={1.5} />
				</button>
			</div>

			{#if auth.isAuthenticated}
				<div class="mt-4 space-y-3 text-xs">
					<div>
						<p class="text-faint">Logged in as:</p>
						<p class="text-sm font-medium text-cream">{auth.user?.email}</p>
					</div>
					<div>
						<p class="text-faint">Room Callsign:</p>
						<p class="font-mono text-lamp">{auth.displayName}</p>
					</div>
					<div class="pt-4 border-t border-cream/10 flex justify-between items-center">
						<button class="btn btn-ghost btn-sm text-xs" onclick={handleSignOut}>
							<IconLogout size={14} stroke={1.5} />
							Sign Out
						</button>
						<button class="btn btn-primary btn-sm" onclick={() => (open = false)}>
							Done
						</button>
					</div>
				</div>
			{:else}
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
								placeholder="e.g. ember-owl-42"
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
							placeholder="you@nightowl.fm"
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
			{/if}
		</div>
	</div>
{/if}
