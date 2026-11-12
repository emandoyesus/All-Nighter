<script lang="ts">
	import { onMount, tick } from 'svelte';

	const storageKey = 'an.room-guide.v1';
	const steps = [
		{ title: 'Find your room', text: 'Join a room from the lobby, open an invite link, or create your own. Some rooms ask you to knock and wait for the host to let you in.', tip: 'Already inside? You can follow the rest of this guide without leaving.' },
		{ title: 'Settle into the music', text: 'The room shares a track queue. Use the player or the bottom music dock to control your own volume. If audio has not started, interact with the player to enable it.', tip: 'Muting your audio only affects you. A host or admin can pause playback for everyone.' },
		{ title: 'Add a track and say hello', text: 'Open Queue to add a YouTube link. Use Chat to introduce yourself, and check Awake now to see who is here.', tip: 'On smaller screens, use the Queue, Chat, and Crew tabs to switch panels.' },
		{ title: 'Make space to focus', text: 'Use the room’s Focus mode when it is time to work. Focus hides the chat and queue so you can settle into your session. The fullscreen focus view gives you a quieter workspace.', tip: 'In Awake now, open “Your intention & mood” to tell the crew what you are working on.' },
		{ title: 'Bring your crew along', text: 'Use Share Room to invite a friend. When you are ready to record your session, open Log. Use Leave when you want to step out of the room.', tip: 'You can reopen this walkthrough anytime with Room guide.' }
	];
	let open = $state(false);
	let step = $state(0);
	let heading = $state<HTMLHeadingElement>();
	let trigger = $state<HTMLButtonElement>();

	onMount(() => {
		try { open = localStorage.getItem(storageKey) !== 'done'; }
		catch { open = true; }
	});

	async function navigate(next: number) {
		step = next;
		open = true;
		await tick();
		heading?.focus();
	}

	async function dismiss() {
		open = false;
		try { localStorage.setItem(storageKey, 'done'); } catch {}
		await tick();
		trigger?.focus();
	}
</script>

<section class="mx-auto w-full max-w-[1440px] px-3 py-3 sm:px-5" aria-label="Room walkthrough">
	{#if open}
		<div class="rounded-2xl border border-lamp/30 bg-night-2 p-5 sm:p-6">
			<div class="flex items-center justify-between gap-4">
				<p class="num text-xs text-lamp">YOUR FIRST NIGHT · {step + 1} / {steps.length}</p>
				<button type="button" class="btn btn-ghost btn-sm" onclick={dismiss}>Skip guide</button>
			</div>
			<div class="mt-3 max-w-2xl">
				<h2 bind:this={heading} tabindex="-1" class="text-xl font-semibold text-cream outline-none">{steps[step].title}</h2>
				<p class="mt-2 text-sm leading-relaxed text-taupe">{steps[step].text}</p>
				<p class="mt-3 border-l-2 border-lamp/40 pl-3 text-xs leading-relaxed text-cream">{steps[step].tip}</p>
			</div>
			<div class="mt-5 flex items-center justify-between gap-3">
				<div class="flex gap-1.5" aria-hidden="true">
					{#each steps as _, index}<span class="h-1 w-6 rounded-full {index <= step ? 'bg-lamp' : 'bg-cream/15'}"></span>{/each}
				</div>
				<div class="flex gap-2">
					{#if step > 0}<button type="button" class="btn btn-secondary btn-sm" onclick={() => navigate(step - 1)}>Back</button>{/if}
					<button type="button" class="btn btn-primary btn-sm" onclick={() => step === steps.length - 1 ? dismiss() : navigate(step + 1)}>{step === steps.length - 1 ? 'Got it' : 'Next'}</button>
				</div>
			</div>
		</div>
	{:else}
		<button bind:this={trigger} type="button" class="btn btn-ghost btn-sm" onclick={() => navigate(0)}>Room guide</button>
	{/if}
</section>
