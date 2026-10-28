<script lang="ts">
	import { onMount } from 'svelte';
	import { DAWN } from '#lib/config';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import IconPencil from '@tabler/icons-svelte/icons/pencil';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconMoon from '@tabler/icons-svelte/icons/moon';

	interface Props {
		size?: 'compact' | 'big';
	}

	let { size = 'compact' }: Props = $props();

	const LS_DAWN = 'an.dawn_time';

	function loadDawn(): { h: number; m: number } {
		try {
			const saved = localStorage.getItem(LS_DAWN);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (typeof parsed?.h === 'number' && typeof parsed?.m === 'number') {
					return { h: parsed.h, m: parsed.m };
				}
			}
		} catch {}
		return { ...DAWN };
	}

	let dawn = $state(loadDawn());
	let editing = $state(false);
	let editH = $state(0);
	let editM = $state(0);
	let left = $state('--:--:--');
	let isSunrise = $state(false);
	let progress = $state(15);

	function saveDawn(): void {
		const h = Math.max(0, Math.min(23, Number(editH) || 0));
		const m = Math.max(0, Math.min(59, Number(editM) || 0));
		dawn = { h, m };
		editing = false;
		try {
			localStorage.setItem(LS_DAWN, JSON.stringify(dawn));
		} catch {}
		updateTime();
	}

	function format(ms: number): string {
		const total = Math.max(0, Math.floor(ms / 1000));
		const h = Math.floor(total / 3600);
		const m = Math.floor((total % 3600) / 60);
		const s = total % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	function updateTime(): void {
		const now = new Date();
		const todayDawn = new Date(now);
		todayDawn.setHours(dawn.h, dawn.m, 0, 0);

		const diff = now.getTime() - todayDawn.getTime();
		// Within 90 minutes post-dawn: celebrate sunrise
		if (diff >= 0 && diff < 90 * 60 * 1000) {
			isSunrise = true;
			left = '00:00:00';
			return;
		}

		isSunrise = false;
		const next = new Date(todayDawn);
		if (now.getTime() >= todayDawn.getTime()) {
			next.setDate(next.getDate() + 1);
		}
		const remainingMs = next.getTime() - now.getTime();
		left = format(remainingMs);

		// Calculate night progress assuming night window starts at 22:00 (10 PM)
		const nightStart = new Date(next);
		nightStart.setDate(nightStart.getDate() - 1);
		nightStart.setHours(22, 0, 0, 0);
		const totalNightMs = next.getTime() - nightStart.getTime();
		const elapsedMs = Math.max(0, now.getTime() - nightStart.getTime());
		progress = Math.min(100, Math.max(5, (elapsedMs / totalNightMs) * 100));
	}

	onMount(() => {
		updateTime();
		const id = window.setInterval(updateTime, 1000);
		return () => window.clearInterval(id);
	});
</script>

{#if size === 'big'}
	{#if isSunrise}
		<div class="panel flex flex-col justify-between p-8 sm:p-10 md:p-12 border-lamp/40 bg-night-2/80 min-h-[360px] lg:min-h-[420px]">
			<div class="flex items-center justify-between">
				<span class="inline-flex items-center gap-2 rounded-full bg-lamp/15 px-3 py-1 text-xs font-medium text-lamp">
					<IconSun size={16} stroke={2} />
					Sunrise reached
				</span>
				<span class="num text-xs text-faint">
					{String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')} local dawn
				</span>
			</div>

			<div class="my-auto py-6">
				<p class="num font-mono text-xs uppercase tracking-[0.25em] text-faint">session complete</p>
				<h2 class="mt-2 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-cream">
					You made it through the night.
				</h2>
				<p class="mt-3 max-w-[42ch] text-sm leading-relaxed text-taupe">
					The sky is turning orange. The session has come to an end. Every track and intention was logged.
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-3 pt-4 border-t border-cream/10">
				<a href="/archive" class="btn btn-primary">
					View the archive
				</a>
				<button class="btn btn-ghost text-sm" onclick={() => (isSunrise = false)}>
					Dismiss
				</button>
			</div>
		</div>
	{:else}
		<div class="panel relative flex flex-col justify-between p-7 sm:p-9 md:p-10 lg:p-12 border-cream/10 bg-night-2/80 backdrop-blur-sm min-h-[380px] lg:min-h-[440px]">
			<!-- Header -->
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-2.5">
					<span class="grid h-8 w-8 place-items-center rounded-full bg-lamp/10 text-lamp">
						<IconMoon size={16} stroke={1.5} />
					</span>
					<div>
						<p class="num text-[10px] uppercase tracking-[0.2em] text-faint">countdown</p>
						<p class="text-xs font-medium text-cream">Until sunrise</p>
					</div>
				</div>

				{#if !editing}
					<button
						class="inline-flex items-center gap-1.5 rounded-full border border-cream/12 bg-night/50 px-3 py-1 text-xs text-taupe transition-colors hover:border-cream/25 hover:text-cream"
						onclick={() => {
							editing = true;
							editH = dawn.h;
							editM = dawn.m;
						}}
						title="Customize dawn target time"
						aria-label="Customize dawn time"
					>
						<span class="num text-xs">{String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')}</span>
						<span class="text-[10px] text-faint uppercase">local</span>
						<IconPencil size={12} stroke={1.5} class="text-faint ml-0.5" />
					</button>
				{/if}
			</div>

			<!-- Centerpiece -->
			<div class="my-auto py-6 sm:py-8">
				{#if editing}
					<form
						class="rounded-card border border-cream/15 bg-night/90 p-5"
						onsubmit={(e) => {
							e.preventDefault();
							saveDawn();
						}}
					>
						<p class="text-xs font-medium text-cream mb-1">Set your dawn target time:</p>
						<p class="text-[11px] text-faint mb-3">Adjust when your local morning starts.</p>
						<div class="flex items-center gap-2">
							<input
								type="number"
								min="0"
								max="23"
								class="w-16 rounded border border-cream/20 bg-night-3 px-2.5 py-1.5 num text-lg text-cream outline-none focus:border-lamp"
								bind:value={editH}
							/>
							<span class="text-lg text-faint font-mono">:</span>
							<input
								type="number"
								min="0"
								max="59"
								class="w-16 rounded border border-cream/20 bg-night-3 px-2.5 py-1.5 num text-lg text-cream outline-none focus:border-lamp"
								bind:value={editM}
							/>
							<button type="submit" class="btn btn-primary btn-sm ml-2">
								<IconCheck size={14} stroke={2} />
								Save
							</button>
							<button type="button" class="btn btn-ghost btn-sm" onclick={() => (editing = false)}>
								Cancel
							</button>
						</div>
					</form>
				{:else}
					<div>
						<div class="flex items-baseline justify-between">
							<p class="num font-mono text-[11px] uppercase tracking-[0.24em] text-faint">
								time remaining
							</p>
							<span class="num font-mono text-[11px] text-faint tracking-wider">HH:MM:SS</span>
						</div>
						<h2
							class="num mt-2 font-mono text-5xl font-semibold tracking-tighter text-cream sm:text-6xl md:text-7xl lg:text-8xl leading-none"
							aria-label="time until sunrise"
						>
							{left}
						</h2>
					</div>
				{/if}
			</div>

			<!-- Progress footer -->
			<div class="border-t border-cream/10 pt-4">
				<div class="mb-2 flex items-center justify-between text-xs">
					<span class="num text-faint tracking-wide uppercase text-[10px]">night progress</span>
					<span class="num text-lamp font-medium">{Math.round(progress)}% to dawn</span>
				</div>
				<div class="progress-bar h-2 bg-cream/8">
					<div class="progress-fill" style="width: {progress}%"></div>
				</div>
				<div class="mt-2.5 flex items-center justify-between text-[11px] text-faint">
					<span>10:00 PM session start</span>
					<span>Sunrise: {String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')} AM</span>
				</div>
			</div>
		</div>
	{/if}
{:else}
	<!-- Compact variant -->
	{#if isSunrise}
		<div class="panel border-lamp/40 bg-gradient-to-b from-night-3 to-night-2 p-5 shadow-lg">
			<div class="flex items-center justify-between">
				<span class="inline-flex items-center gap-1.5 rounded-full bg-lamp/15 px-2.5 py-0.5 text-xs font-medium text-lamp">
					<IconSun size={15} stroke={2} />
					Sunrise reached
				</span>
				<span class="num text-xs text-faint">{String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')} local</span>
			</div>

			<h3 class="mt-3 text-xl font-semibold text-cream">You made it through the night.</h3>
			<p class="mt-1 text-xs leading-relaxed text-taupe">
				The sky is turning orange. The all-nighter is logged.
			</p>

			<div class="mt-4 flex items-center gap-2">
				<a href="/archive" class="btn btn-primary btn-sm">
					View the archive
				</a>
				<button class="btn btn-ghost btn-sm text-xs" onclick={() => (isSunrise = false)}>
					Dismiss
				</button>
			</div>
		</div>
	{:else}
		<div class="panel p-5">
			<div class="flex items-center justify-between">
				<p class="text-sm text-taupe">till sunrise</p>
				<button
					class="icon-btn text-faint hover:text-cream"
					onclick={() => {
						editing = !editing;
						editH = dawn.h;
						editM = dawn.m;
					}}
					title="Customize dawn target time"
					aria-label="Customize dawn time"
				>
					<IconPencil size={13} stroke={1.5} />
				</button>
			</div>

			<p class="num mt-2 text-4xl leading-none tracking-tight md:text-[2.6rem]" aria-label="time until sunrise">
				{left}
			</p>

			{#if editing}
				<form class="mt-3 flex items-center gap-2 border-t border-cream/10 pt-3" onsubmit={(e) => { e.preventDefault(); saveDawn(); }}>
					<span class="text-xs text-faint">Target:</span>
					<input
						type="number"
						min="0"
						max="23"
						class="w-12 rounded border border-cream/15 bg-night/80 px-1.5 py-0.5 num text-xs text-cream outline-none focus:border-lamp"
						bind:value={editH}
					/>
					<span class="text-xs text-faint">:</span>
					<input
						type="number"
						min="0"
						max="59"
						class="w-12 rounded border border-cream/15 bg-night/80 px-1.5 py-0.5 num text-xs text-cream outline-none focus:border-lamp"
						bind:value={editM}
					/>
					<button type="submit" class="icon-btn text-lamp hover:text-cream" title="Save time" aria-label="Save time">
						<IconCheck size={14} stroke={2} />
					</button>
				</form>
			{:else}
				<p class="num mt-2.5 text-xs text-faint">
					dawn at {String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')} local
				</p>
			{/if}

			<div class="mt-4 border-t border-cream/8 pt-3">
				<div class="mb-1.5 flex items-center justify-between text-[11px] text-faint">
					<span>night progress</span>
					<span class="num text-taupe">{Math.round(progress)}% to dawn</span>
				</div>
				<div class="progress-bar">
					<div class="progress-fill" style="width: {progress}%"></div>
				</div>
			</div>
		</div>
	{/if}
{/if}
