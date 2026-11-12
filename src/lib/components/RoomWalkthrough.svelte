<script lang="ts">
	import { onMount, tick } from 'svelte';
	import IconMoonStars from '@tabler/icons-svelte/icons/moon-stars';
	import IconHeadphones from '@tabler/icons-svelte/icons/headphones';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconFlame from '@tabler/icons-svelte/icons/flame';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import IconBulb from '@tabler/icons-svelte/icons/bulb';
	import IconArrowRight from '@tabler/icons-svelte/icons/arrow-right';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconX from '@tabler/icons-svelte/icons/x';

	const storageKey = 'an.room-guide.v1';

	const steps = [
		{
			badge: 'WELCOME · 1 / 5',
			title: 'Lock in until the sunrise',
			text: 'All-Nighter is a shared nocturnal sanctuary. Join other night owls, developers, designers, and thinkers locked into deep work until 06:00 dawn.',
			tip: 'You can work in total silence or plug into the shared collaborative audio stream.',
			icon: IconMoonStars
		},
		{
			badge: 'AUDIO · 2 / 5',
			title: 'Shared tunes, individual volume',
			text: 'Every room features a synchronized YouTube music stream. Use the bottom music dock or the player to tune your personal volume or mute whenever you need quiet.',
			tip: 'Muting only affects your own audio. The room host manages playback controls for the collective.',
			icon: IconHeadphones
		},
		{
			badge: 'QUEUE & CHAT · 3 / 5',
			title: 'Drop YouTube links & connect',
			text: 'Open the Queue panel to paste any YouTube music link into the session. Use Chat to introduce yourself, share thoughts, and celebrate progress with live emoji reactions.',
			tip: 'On mobile screens, use the Queue, Chat, and Crew tabs to switch views seamlessly.',
			icon: IconMusic
		},
		{
			badge: 'DEEP WORK · 4 / 5',
			title: 'Focus mode & nightly intentions',
			text: 'Need to eliminate distractions? Toggle Focus Mode to hide chat and queue, expanding your workspace. Open Crew to broadcast what you are building tonight.',
			tip: 'Setting your one-line intention lets others know what craft you are dedicating your night to.',
			icon: IconFlame
		},
		{
			badge: 'SUNRISE · 5 / 5',
			title: 'The Dawn Ritual & Logbook',
			text: 'When the countdown strikes 06:00, dawn arrives! The room unlocks the sunrise ritual, allowing you and your crew to celebrate and archive your collective night to your personal logbook.',
			tip: 'You are all set. Make yourself at home and enjoy the night shift.',
			icon: IconSun
		}
	];

	let open = $state(false);
	let step = $state(0);
	let cardElement = $state<HTMLDivElement>();

	onMount(() => {
		try {
			const hasSeenGuide = localStorage.getItem(storageKey) === 'done';
			const isExistingUser = Boolean(
				localStorage.getItem('an.profile_configured') ||
				localStorage.getItem('an.user_stats') ||
				localStorage.getItem('an.sessions')
			);

			// Only display for genuinely new users who haven't completed the walkthrough
			if (!hasSeenGuide && !isExistingUser) {
				open = true;
			} else if (!hasSeenGuide && isExistingUser) {
				// Mark as done for existing users so they are never interrupted
				localStorage.setItem(storageKey, 'done');
			}
		} catch {
			open = false;
		}
	});

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

	async function navigate(next: number) {
		if (next < 0) return;
		if (next >= steps.length) {
			dismiss();
			return;
		}
		step = next;
		await tick();
		cardElement?.focus();
	}

	function dismiss() {
		open = false;
		try {
			localStorage.setItem(storageKey, 'done');
		} catch {}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			dismiss();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			navigate(step + 1);
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			navigate(step - 1);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		use:portal
		class="fixed inset-0 z-[200] flex items-center justify-center bg-night/90 p-4 sm:p-6 backdrop-blur-xl animate-in fade-in duration-200"
		role="dialog"
		aria-modal="true"
		aria-labelledby="walkthrough-title"
	>
		<!-- Ambient atmospheric glow -->
		<div
			class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(66,211,146,0.12),transparent_65%)]"
			aria-hidden="true"
		></div>

		<div
			bind:this={cardElement}
			tabindex="-1"
			class="relative w-full max-w-xl sm:max-w-2xl rounded-3xl border border-cream/15 bg-[#0a1012] p-6 sm:p-9 shadow-2xl text-cream outline-none animate-in zoom-in-95 duration-200 flex flex-col justify-between overflow-hidden"
		>
			<!-- Top Header -->
			<div class="flex items-center justify-between gap-4">
				<div class="flex items-center gap-2">
					<span class="inline-flex items-center gap-1.5 rounded-full border border-lamp/30 bg-lamp/10 px-3 py-1 text-xs font-mono font-medium text-lamp shadow-sm">
						<span class="h-1.5 w-1.5 rounded-full bg-lamp animate-pulse"></span>
						{steps[step].badge}
					</span>
				</div>

				<button
					type="button"
					class="btn btn-ghost btn-sm text-xs font-mono text-taupe hover:text-cream flex items-center gap-1.5 px-3 py-1 cursor-pointer transition-colors"
					onclick={dismiss}
					aria-label="Skip walkthrough"
				>
					<span>Skip</span>
					<IconX size={15} stroke={1.8} />
				</button>
			</div>

			<!-- Main Step Content -->
			<div class="mt-6 sm:mt-8">
				<div class="flex items-center gap-4">
					<span class="grid h-14 w-14 sm:h-16 sm:w-16 shrink-0 place-items-center rounded-2xl border border-lamp/30 bg-lamp/15 text-lamp shadow-inner">
						{#key step}
							{@const StepIcon = steps[step].icon}
							<StepIcon size={30} stroke={1.8} class="animate-in fade-in zoom-in-90 duration-200" />
						{/key}
					</span>
					<div>
						<p class="text-[11px] font-mono uppercase tracking-wider text-faint">Night Shift Guide</p>
						<h2 id="walkthrough-title" class="text-xl sm:text-2xl font-bold text-cream tracking-tight mt-0.5">
							{steps[step].title}
						</h2>
					</div>
				</div>

				<p class="mt-4 sm:mt-5 text-sm sm:text-base leading-relaxed text-taupe">
					{steps[step].text}
				</p>

				<!-- Helpful Tip Box -->
				<div class="mt-5 rounded-2xl border border-cream/10 bg-[#060a0b] p-3.5 sm:p-4 flex items-start gap-3">
					<span class="text-lamp shrink-0 mt-0.5">
						<IconBulb size={18} stroke={1.8} />
					</span>
					<p class="text-xs sm:text-sm text-cream/90 leading-relaxed font-normal">
						<span class="font-medium text-lamp">Tip:</span> {steps[step].tip}
					</p>
				</div>
			</div>

			<!-- Bottom Navigation Footer -->
			<div class="mt-7 sm:mt-9 flex items-center justify-between gap-4 border-t border-cream/10 pt-4 sm:pt-5">
				<!-- Step Progress Bars -->
				<div class="flex items-center gap-1.5" aria-label="Step {step + 1} of {steps.length}">
					{#each steps as _, idx}
						<button
							type="button"
							class="h-1.5 rounded-full transition-all duration-300 cursor-pointer {idx === step
								? 'w-8 bg-lamp shadow-sm shadow-lamp/50'
								: idx < step
									? 'w-4 bg-lamp/50'
									: 'w-4 bg-cream/15 hover:bg-cream/30'}"
							onclick={() => navigate(idx)}
							aria-label="Go to step {idx + 1}"
						></button>
					{/each}
				</div>

				<!-- Navigation Actions -->
				<div class="flex items-center gap-2">
					{#if step > 0}
						<button
							type="button"
							class="btn btn-ghost btn-sm text-xs font-mono px-3.5 py-2 text-taupe hover:text-cream flex items-center gap-1.5 cursor-pointer"
							onclick={() => navigate(step - 1)}
						>
							<IconArrowLeft size={14} stroke={2} />
							<span>Back</span>
						</button>
					{/if}

					{#if step < steps.length - 1}
						<button
							type="button"
							class="btn btn-primary btn-sm text-xs sm:text-sm font-mono px-4 py-2 flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.02]"
							onclick={() => navigate(step + 1)}
						>
							<span>Next</span>
							<IconArrowRight size={15} stroke={2} />
						</button>
					{:else}
						<button
							type="button"
							class="btn btn-primary btn-sm text-xs sm:text-sm font-mono px-4 sm:px-5 py-2 flex items-center gap-2 cursor-pointer shadow-lg shadow-lamp/25 font-semibold transition-all hover:scale-[1.02]"
							onclick={dismiss}
						>
							<IconCheck size={16} stroke={2.5} />
							<span>Enter Room</span>
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
