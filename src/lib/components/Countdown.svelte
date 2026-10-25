<script lang="ts">
	import { onMount } from 'svelte';
	import { DAWN } from '#lib/config';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import IconPencil from '@tabler/icons-svelte/icons/pencil';
	import IconCheck from '@tabler/icons-svelte/icons/check';

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

{#if isSunrise}
	<div class="panel border-lamp/40 bg-gradient-to-b from-night-3 to-night-2 p-5 shadow-[0_0_25px_color-mix(in_srgb,var(--color-lamp)_14%,transparent)]">
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
