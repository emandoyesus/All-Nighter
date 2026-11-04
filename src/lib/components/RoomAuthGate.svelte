<script lang="ts">
	import { auth } from '#lib/auth.svelte';
	import { room } from '#lib/room/room.svelte';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconSparkles from '@tabler/icons-svelte/icons/sparkles';
	import IconLock from '@tabler/icons-svelte/icons/lock';
	import IconArrowRight from '@tabler/icons-svelte/icons/arrow-right';

	let isSignUp = $state(false);
	let email = $state('');
	let password = $state('');
	let callsign = $state(room.name || '');
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
					if (callsign) room.setName(callsign);
				} else {
					successMsg = 'Verification link sent to your email! Check your inbox.';
				}
			} else {
				const { data, error: err } = await auth.signInWithEmail(email, password);
				if (err) throw err;
				if (data.user?.user_metadata?.callsign) {
					room.setName(data.user.user_metadata.callsign);
				}
			}
		} catch (err: any) {
			error = err?.message || 'Authentication failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="mx-auto max-w-md py-8">
	<div class="relative overflow-hidden rounded-2xl border border-cream/15 bg-night-2/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
		<div class="text-center">
			<span class="inline-flex h-12 w-12 items-center justify-center rounded-full border border-lamp/30 bg-lamp/10 text-lamp mb-4">
				<IconMoon size={22} stroke={1.7} />
			</span>
			<h2 class="text-2xl font-bold tracking-tight text-cream">
				{isSignUp ? 'Join the Night Crew' : 'Sign In to Enter the Room'}
			</h2>
			<p class="mt-2 text-xs leading-relaxed text-taupe">
				Participate in live sessions, queue music in sync, and log your progress till sunrise.
			</p>
		</div>

		<form class="mt-6 space-y-4" onsubmit={handleSubmit}>
			{#if error}
				<div class="rounded-lg border border-ruby/30 bg-ruby/10 p-3 text-xs text-rose-300">
					{error}
				</div>
			{/if}
			{#if successMsg}
				<div class="rounded-lg border border-lamp/30 bg-lamp/10 p-3 text-xs text-lamp">
					{successMsg}
				</div>
			{/if}

			{#if isSignUp}
				<div>
					<label for="room-callsign" class="block font-mono text-[11px] uppercase tracking-wider text-faint mb-1.5">
						Your Callsign
					</label>
					<input
						id="room-callsign"
						type="text"
						required
						class="w-full rounded-lg border border-cream/15 bg-night px-3.5 py-2 text-xs font-mono text-cream outline-none transition-colors focus:border-lamp"
						placeholder="e.g. solomon"
						bind:value={callsign}
					/>
				</div>
			{/if}

			<div>
				<label for="room-email" class="block font-mono text-[11px] uppercase tracking-wider text-faint mb-1.5">
					Email Address
				</label>
				<input
					id="room-email"
					type="email"
					required
					class="w-full rounded-lg border border-cream/15 bg-night px-3.5 py-2 text-xs font-mono text-cream outline-none transition-colors focus:border-lamp"
					placeholder="you@example.com"
					bind:value={email}
				/>
			</div>

			<div>
				<label for="room-password" class="block font-mono text-[11px] uppercase tracking-wider text-faint mb-1.5">
					Password
				</label>
				<input
					id="room-password"
					type="password"
					required
					minlength="6"
					class="w-full rounded-lg border border-cream/15 bg-night px-3.5 py-2 text-xs font-mono text-cream outline-none transition-colors focus:border-lamp"
					placeholder="••••••••"
					bind:value={password}
				/>
			</div>

			<button
				type="submit"
				class="btn btn-primary w-full text-xs font-medium tracking-wide mt-2"
				disabled={loading}
			>
				{#if loading}
					Connecting...
				{:else}
					<span>{isSignUp ? 'Create Account & Enter' : 'Sign In & Enter'}</span>
					<IconArrowRight size={14} stroke={2} />
				{/if}
			</button>

			<div class="pt-2 text-center text-xs">
				<button
					type="button"
					class="text-lamp hover:underline font-medium"
					onclick={() => {
						isSignUp = !isSignUp;
						error = '';
						successMsg = '';
					}}
				>
					{isSignUp ? 'Already have an account? Sign In' : 'New here? Create an account'}
				</button>
			</div>
		</form>
	</div>
</div>
