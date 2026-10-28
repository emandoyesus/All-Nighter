<script lang="ts">
	import { onMount } from 'svelte';
	import { DAWN } from '#lib/config';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import IconPencil from '@tabler/icons-svelte/icons/pencil';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconSparkles from '@tabler/icons-svelte/icons/sparkles';
	import IconFlame from '@tabler/icons-svelte/icons/flame';
	import IconBolt from '@tabler/icons-svelte/icons/bolt';

	type CountdownStyle = 'flip' | 'arc' | 'grid';
	type CountdownPhase = 'pre_midnight' | 'session_active' | 'sunrise';
	type PhaseMode = 'auto' | 'pre_midnight' | 'session_active';

	interface Props {
		size?: 'compact' | 'big';
	}

	let { size = 'compact' }: Props = $props();

	const LS_DAWN = 'an.dawn_time';
	const LS_STYLE = 'an.countdown_style';
	const LS_PHASE_MODE = 'an.countdown_phase_mode';

	function loadDawn(): { h: number; m: number } {
		try {
			const saved = localStorage.getItem(LS_DAWN);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (typeof parsed?.h === 'number' && typeof parsed?.m === 'number') {
					if (parsed.h === 6 && parsed.m === 30) {
						return { ...DAWN };
					}
					return { h: parsed.h, m: parsed.m };
				}
			}
		} catch {}
		return { ...DAWN };
	}

	function loadStyle(): CountdownStyle {
		try {
			const saved = localStorage.getItem(LS_STYLE);
			if (saved === 'flip' || saved === 'arc' || saved === 'grid') {
				return saved;
			}
		} catch {}
		return 'flip';
	}

	function loadPhaseMode(): PhaseMode {
		try {
			if (typeof window !== 'undefined') {
				const params = new URLSearchParams(window.location.search);
				const p = params.get('phase');
				if (p === 'pre_midnight' || p === 'session_active') {
					return p;
				}
			}
			const saved = localStorage.getItem(LS_PHASE_MODE);
			if (saved === 'auto' || saved === 'pre_midnight' || saved === 'session_active') {
				return saved;
			}
		} catch {}
		return 'auto';
	}

	let dawn = $state(loadDawn());
	let activeStyle = $state<CountdownStyle>(loadStyle());
	let phaseMode = $state<PhaseMode>(loadPhaseMode());
	let currentPhase = $state<CountdownPhase>('pre_midnight');

	let editing = $state(false);
	let editH = $state(0);
	let editM = $state(0);
	let left = $state('--:--:--');
	let isSunrise = $state(false);
	let progress = $state(0);

	function setStyle(style: CountdownStyle): void {
		activeStyle = style;
		try {
			localStorage.setItem(LS_STYLE, style);
		} catch {}
	}

	function setPhaseMode(mode: PhaseMode): void {
		phaseMode = mode;
		try {
			localStorage.setItem(LS_PHASE_MODE, mode);
		} catch {}
		updateTime();
	}

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

		// Sunrise celebration window: within 90 minutes post-dawn
		const diff = now.getTime() - todayDawn.getTime();
		if (diff >= 0 && diff < 90 * 60 * 1000) {
			isSunrise = true;
			left = '00:00:00';
			currentPhase = 'sunrise';
			return;
		}

		isSunrise = false;

		// Session hours are from 00:00 to Dawn (e.g. 06:00)
		const isSessionHours =
			now.getHours() >= 0 &&
			(now.getHours() < dawn.h || (now.getHours() === dawn.h && now.getMinutes() < dawn.m));

		const autoPhase: CountdownPhase = isSessionHours ? 'session_active' : 'pre_midnight';
		currentPhase = phaseMode === 'auto' ? autoPhase : phaseMode;

		if (currentPhase === 'pre_midnight') {
			// COUNTDOWN 1: WAITING FOR MIDNIGHT (Session Start)
			const midnight = new Date(now);
			midnight.setHours(24, 0, 0, 0); // 00:00:00 of next day
			const remainingMs = Math.max(0, midnight.getTime() - now.getTime());
			left = format(remainingMs);

			// 6-hour evening prep window from 18:00 to 24:00
			const eveningStart = new Date(now);
			eveningStart.setHours(18, 0, 0, 0);
			const totalPrepMs = midnight.getTime() - eveningStart.getTime();
			const elapsedMs = Math.max(0, now.getTime() - eveningStart.getTime());
			progress = Math.min(100, Math.max(5, (elapsedMs / totalPrepMs) * 100));
		} else {
			// COUNTDOWN 2: ACTIVE SESSION TILL DAWN (Session Finish)
			const nextDawn = new Date(todayDawn);
			if (now.getTime() >= todayDawn.getTime() && now.getHours() >= dawn.h) {
				nextDawn.setDate(nextDawn.getDate() + 1);
			}
			const remainingMs = Math.max(0, nextDawn.getTime() - now.getTime());
			left = format(remainingMs);

			// 6-hour night session from 00:00 to Dawn
			const nightStart = new Date(nextDawn);
			nightStart.setHours(0, 0, 0, 0);
			const totalNightMs = Math.max(1000, nextDawn.getTime() - nightStart.getTime());
			const elapsedMs = Math.max(0, now.getTime() - nightStart.getTime());
			progress = Math.min(100, Math.max(0, (elapsedMs / totalNightMs) * 100));
		}
	}

	let hStr = $derived(left !== '--:--:--' ? left.split(':')[0] : '00');
	let mStr = $derived(left !== '--:--:--' ? left.split(':')[1] : '00');
	let sStr = $derived(left !== '--:--:--' ? left.split(':')[2] : '00');

	let remainingText = $derived.by(() => {
		const h = parseInt(hStr, 10) || 0;
		const m = parseInt(mStr, 10) || 0;
		if (currentPhase === 'pre_midnight') {
			if (h === 0) return `${m}m until midnight lock-in`;
			return `${h}h ${m}m until midnight lock-in`;
		} else {
			if (h === 0) return `${m}m remaining till dawn`;
			return `${h}h ${m}m remaining till dawn`;
		}
	});

	// Celestial arc math for the moon position along a quadratic bezier curve:
	// Start (36, 128), Control (180, 16), End (324, 128)
	let moonPos = $derived.by(() => {
		const t = Math.max(0, Math.min(1, progress / 100));
		const inv = 1 - t;
		const x = inv * inv * 36 + 2 * inv * t * 180 + t * t * 324;
		const y = inv * inv * 128 + 2 * inv * t * 16 + t * t * 128;
		return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
	});

	onMount(() => {
		dawn = loadDawn();
		activeStyle = loadStyle();
		phaseMode = loadPhaseMode();
		updateTime();
		const id = window.setInterval(updateTime, 1000);
		return () => window.clearInterval(id);
	});
</script>

{#if size === 'big'}
	{#if isSunrise}
		<div class="relative flex flex-col justify-between py-4">
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
		<div class="relative flex flex-col justify-center gap-5 sm:gap-6">
			<!-- Header with Phase Switcher & Style Controls -->
			<div class="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-cream/10">
				<!-- Phase Status & Identity -->
				<div class="flex items-center gap-2.5">
					{#if currentPhase === 'pre_midnight'}
						<!-- Phase 1: Warm Amber Beacon -->
						<span class="relative flex h-2.5 w-2.5">
							<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-60"></span>
							<span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber"></span>
						</span>
						<div>
							<div class="flex items-center gap-1.5">
								<p class="num text-[10px] font-mono uppercase tracking-[0.22em] text-amber font-semibold">1 · Pre-session</p>
								<span class="text-faint/60">·</span>
								<p class="text-xs font-medium text-cream">Doors open at midnight</p>
							</div>
						</div>
					{:else}
						<!-- Phase 2: Electric Sage Beacon -->
						<span class="relative flex h-2.5 w-2.5">
							<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-lamp opacity-60"></span>
							<span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-lamp"></span>
						</span>
						<div>
							<div class="flex items-center gap-1.5">
								<p class="num text-[10px] font-mono uppercase tracking-[0.22em] text-lamp font-semibold">2 · Session live</p>
								<span class="text-faint/60">·</span>
								<p class="text-xs font-medium text-cream">Lock-in till sunrise</p>
							</div>
						</div>
					{/if}
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<!-- Phase Selector (Switch between Countdown 1 and Countdown 2) -->
					<div class="inline-flex rounded-full border border-cream/12 bg-night/80 p-0.5" role="group" aria-label="Countdown phase selector">
						{#if currentPhase === 'pre_midnight'}
							<button
								class="inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber/20 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber transition-colors"
								onclick={() => setPhaseMode('pre_midnight')}
								title="Countdown 1: Waiting for midnight (00:00)"
							>
								<IconFlame size={12} stroke={2} />
								1. To Midnight
							</button>
						{:else}
							<button
								class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] text-faint transition-colors hover:text-taupe"
								onclick={() => setPhaseMode('pre_midnight')}
								title="Countdown 1: Waiting for midnight (00:00)"
							>
								<IconFlame size={12} stroke={2} />
								1. To Midnight
							</button>
						{/if}

						{#if currentPhase === 'session_active'}
							<button
								class="inline-flex items-center gap-1 rounded-full border border-lamp/30 bg-lamp/20 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-lamp transition-colors"
								onclick={() => setPhaseMode('session_active')}
								title="Countdown 2: Active session till dawn (06:00)"
							>
								<IconBolt size={12} stroke={2} />
								2. Till Dawn
							</button>
						{:else}
							<button
								class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] text-faint transition-colors hover:text-taupe"
								onclick={() => setPhaseMode('session_active')}
								title="Countdown 2: Active session till dawn (06:00)"
							>
								<IconBolt size={12} stroke={2} />
								2. Till Dawn
							</button>
						{/if}
						{#if phaseMode !== 'auto'}
							<button
								class="rounded-full px-2 py-0.5 text-[10px] font-mono text-faint hover:text-cream transition-colors"
								onclick={() => setPhaseMode('auto')}
								title="Reset to automatic local time detection"
							>
								auto
							</button>
						{/if}
					</div>

					<!-- Style Selector (Flip / Arc / Grid) -->
					<div class="inline-flex rounded-full border border-cream/12 bg-night/80 p-0.5" role="group" aria-label="Countdown display style">
						<button
							class="rounded-full px-2 py-0.5 text-[11px] font-mono transition-colors {activeStyle === 'flip' ? 'bg-cream/15 text-cream font-medium' : 'text-faint hover:text-taupe'}"
							onclick={() => setStyle('flip')}
							title="Split-flap mechanical cards"
						>
							Flip
						</button>
						<button
							class="rounded-full px-2 py-0.5 text-[11px] font-mono transition-colors {activeStyle === 'arc' ? 'bg-cream/15 text-cream font-medium' : 'text-faint hover:text-taupe'}"
							onclick={() => setStyle('arc')}
							title="Celestial orbital arc"
						>
							Arc
						</button>
						<button
							class="rounded-full px-2 py-0.5 text-[11px] font-mono transition-colors {activeStyle === 'grid' ? 'bg-cream/15 text-cream font-medium' : 'text-faint hover:text-taupe'}"
							onclick={() => setStyle('grid')}
							title="Minimal studio grid"
						>
							Grid
						</button>
					</div>

					<!-- Target Pill -->
					{#if !editing}
						{#if currentPhase === 'pre_midnight'}
							<span class="inline-flex items-center gap-1 rounded-full border border-amber/25 bg-amber/10 px-2.5 py-1 text-xs text-amber font-mono">
								<span>00:00</span>
								<span class="text-[10px] uppercase tracking-wider text-amber/80">start</span>
							</span>
						{:else}
							<button
								class="inline-flex items-center gap-1.5 rounded-full border border-lamp/25 bg-lamp/10 px-2.5 py-1 text-xs text-lamp font-mono transition-colors hover:border-lamp/50"
								onclick={() => {
									editing = true;
									editH = dawn.h;
									editM = dawn.m;
								}}
								title="Customize dawn target time"
								aria-label="Customize dawn time"
							>
								<span>{String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')}</span>
								<span class="text-[10px] uppercase tracking-wider text-lamp/80">dawn</span>
								<IconPencil size={11} stroke={1.5} class="text-lamp/70 ml-0.5" />
							</button>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Dynamic Phase Alert Banner (Transforms when session starts) -->
			<div class="flex items-center">
				{#if currentPhase === 'pre_midnight'}
					<div class="inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/8 px-3 py-1 text-xs text-amber">
						<IconFlame size={13} stroke={2} class="animate-pulse text-amber" />
						<span>Pre-session warmup: doors unlock & queue starts at <strong>00:00 midnight</strong></span>
					</div>
				{:else}
					<div class="inline-flex items-center gap-2 rounded-full border border-lamp/30 bg-lamp/10 px-3 py-1 text-xs text-lamp">
						<span class="relative flex h-2 w-2">
							<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-lamp opacity-75"></span>
							<span class="relative inline-flex h-2 w-2 rounded-full bg-lamp"></span>
						</span>
						<span>All-nighter in progress: locked in until <strong>{String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')} dawn</strong></span>
					</div>
				{/if}
			</div>

			<!-- Centerpiece Display -->
			<div class="py-1 sm:py-2">
				{#if editing}
					<form
						class="rounded-card border border-cream/15 bg-night/95 p-5"
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
				{:else if activeStyle === 'flip'}
					<!-- STYLE 1: MECHANICAL SPLIT-FLAP CARDS (THEMED) -->
					<div class="flex flex-col items-center">
						<div class="grid w-full grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1.5 sm:gap-3 max-w-[460px]">
							<!-- Hours Tile -->
							<div class="flex flex-col items-center">
								<div class="group relative flex aspect-[4/5] sm:aspect-square w-full items-center justify-center overflow-hidden rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.6)] {currentPhase === 'pre_midnight' ? 'border-amber/25 bg-gradient-to-b from-[#24190c] via-[#191108] to-[#0e0904]' : 'border-lamp/25 bg-gradient-to-b from-[#141f17] via-[#0f1712] to-[#080d0a]'}">
									<!-- Upper plate highlight -->
									<div class="absolute inset-x-0 top-0 h-1/2 border-b border-black/80 bg-white/[0.02]"></div>
									<!-- Lower plate subtle shadow -->
									<div class="absolute inset-x-0 bottom-0 h-1/2 border-t {currentPhase === 'pre_midnight' ? 'border-amber/[0.08]' : 'border-lamp/[0.08]'} bg-black/20"></div>

									<!-- Split-flap hinge notches -->
									<span class="absolute -left-1 top-1/2 h-2 w-1.5 -translate-y-1/2 rounded-r-sm border-r {currentPhase === 'pre_midnight' ? 'border-amber/30' : 'border-lamp/30'} bg-night-2"></span>
									<span class="absolute -right-1 top-1/2 h-2 w-1.5 -translate-y-1/2 rounded-l-sm border-l {currentPhase === 'pre_midnight' ? 'border-amber/30' : 'border-lamp/30'} bg-night-2"></span>

									<!-- Numerals -->
									<span class="relative z-10 select-none font-mono text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-cream">
										{hStr}
									</span>
								</div>
								<span class="mt-2.5 font-mono text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.25em] {currentPhase === 'pre_midnight' ? 'text-amber/80' : 'text-lamp/80'}">hours</span>
							</div>

							<!-- Colon dots (Themed color) -->
							<div class="flex flex-col items-center justify-center gap-2 pb-5 sm:pb-6" aria-hidden="true">
								<span class="h-2 w-2 rounded-full {currentPhase === 'pre_midnight' ? 'bg-amber/90 shadow-[0_0_8px_rgba(255,184,77,0.7)]' : 'bg-lamp/90 shadow-[0_0_8px_rgba(142,199,101,0.7)]'}"></span>
								<span class="h-2 w-2 rounded-full {currentPhase === 'pre_midnight' ? 'bg-amber/90 shadow-[0_0_8px_rgba(255,184,77,0.7)]' : 'bg-lamp/90 shadow-[0_0_8px_rgba(142,199,101,0.7)]'}"></span>
							</div>

							<!-- Minutes Tile -->
							<div class="flex flex-col items-center">
								<div class="group relative flex aspect-[4/5] sm:aspect-square w-full items-center justify-center overflow-hidden rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.6)] {currentPhase === 'pre_midnight' ? 'border-amber/25 bg-gradient-to-b from-[#24190c] via-[#191108] to-[#0e0904]' : 'border-lamp/25 bg-gradient-to-b from-[#141f17] via-[#0f1712] to-[#080d0a]'}">
									<div class="absolute inset-x-0 top-0 h-1/2 border-b border-black/80 bg-white/[0.02]"></div>
									<div class="absolute inset-x-0 bottom-0 h-1/2 border-t {currentPhase === 'pre_midnight' ? 'border-amber/[0.08]' : 'border-lamp/[0.08]'} bg-black/20"></div>

									<span class="absolute -left-1 top-1/2 h-2 w-1.5 -translate-y-1/2 rounded-r-sm border-r {currentPhase === 'pre_midnight' ? 'border-amber/30' : 'border-lamp/30'} bg-night-2"></span>
									<span class="absolute -right-1 top-1/2 h-2 w-1.5 -translate-y-1/2 rounded-l-sm border-l {currentPhase === 'pre_midnight' ? 'border-amber/30' : 'border-lamp/30'} bg-night-2"></span>

									<span class="relative z-10 select-none font-mono text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-cream">
										{mStr}
									</span>
								</div>
								<span class="mt-2.5 font-mono text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.25em] {currentPhase === 'pre_midnight' ? 'text-amber/80' : 'text-lamp/80'}">minutes</span>
							</div>

							<!-- Colon dots -->
							<div class="flex flex-col items-center justify-center gap-2 pb-5 sm:pb-6" aria-hidden="true">
								<span class="h-2 w-2 rounded-full {currentPhase === 'pre_midnight' ? 'bg-amber/90 shadow-[0_0_8px_rgba(255,184,77,0.7)]' : 'bg-lamp/90 shadow-[0_0_8px_rgba(142,199,101,0.7)]'}"></span>
								<span class="h-2 w-2 rounded-full {currentPhase === 'pre_midnight' ? 'bg-amber/90 shadow-[0_0_8px_rgba(255,184,77,0.7)]' : 'bg-lamp/90 shadow-[0_0_8px_rgba(142,199,101,0.7)]'}"></span>
							</div>

							<!-- Seconds Tile -->
							<div class="flex flex-col items-center">
								<div class="group relative flex aspect-[4/5] sm:aspect-square w-full items-center justify-center overflow-hidden rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.6)] {currentPhase === 'pre_midnight' ? 'border-amber/25 bg-gradient-to-b from-[#24190c] via-[#191108] to-[#0e0904]' : 'border-lamp/25 bg-gradient-to-b from-[#141f17] via-[#0f1712] to-[#080d0a]'}">
									<div class="absolute inset-x-0 top-0 h-1/2 border-b border-black/80 bg-white/[0.02]"></div>
									<div class="absolute inset-x-0 bottom-0 h-1/2 border-t {currentPhase === 'pre_midnight' ? 'border-amber/[0.08]' : 'border-lamp/[0.08]'} bg-black/20"></div>

									<span class="absolute -left-1 top-1/2 h-2 w-1.5 -translate-y-1/2 rounded-r-sm border-r {currentPhase === 'pre_midnight' ? 'border-amber/30' : 'border-lamp/30'} bg-night-2"></span>
									<span class="absolute -right-1 top-1/2 h-2 w-1.5 -translate-y-1/2 rounded-l-sm border-l {currentPhase === 'pre_midnight' ? 'border-amber/30' : 'border-lamp/30'} bg-night-2"></span>

									<span class="relative z-10 select-none font-mono text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-cream/90">
										{sStr}
									</span>
								</div>
								<span class="mt-2.5 font-mono text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.25em] {currentPhase === 'pre_midnight' ? 'text-amber/80' : 'text-lamp/80'}">seconds</span>
							</div>
						</div>
					</div>
				{:else if activeStyle === 'arc'}
					<!-- STYLE 2: CELESTIAL ORBITAL ARC (THEMED) -->
					<div class="flex flex-col items-center text-center">
						<div class="relative w-full max-w-[420px]">
							<svg viewBox="0 0 360 150" class="w-full h-auto overflow-visible" aria-label="Night celestial arc">
								<defs>
									<linearGradient id="phaseGradient" x1="0%" y1="100%" x2="100%" y2="100%">
										{#if currentPhase === 'pre_midnight'}
											<stop offset="0%" stop-color="#FFB84D" stop-opacity="0.15" />
											<stop offset="50%" stop-color="#FFB84D" stop-opacity="0.3" />
											<stop offset="100%" stop-color="#FFB84D" stop-opacity="0.6" />
										{:else}
											<stop offset="0%" stop-color="#8ec765" stop-opacity="0.2" />
											<stop offset="50%" stop-color="#FFB84D" stop-opacity="0.08" />
											<stop offset="100%" stop-color="#8ec765" stop-opacity="0.5" />
										{/if}
									</linearGradient>
								</defs>

								<!-- Faint background stars -->
								<circle cx="75" cy="40" r="1" fill="#f3fff1" opacity="0.4" />
								<circle cx="130" cy="22" r="1.5" fill="#f3fff1" opacity="0.5" />
								<circle cx="230" cy="28" r="1" fill="#f3fff1" opacity="0.35" />
								<circle cx="285" cy="48" r="1.5" fill="#f3fff1" opacity="0.45" />

								<!-- Horizon base line -->
								<line x1="20" y1="130" x2="340" y2="130" stroke="url(#phaseGradient)" stroke-width="1.5" />

								<!-- Trajectory Guide Track -->
								<path
									d="M 36,128 Q 180,16 324,128"
									fill="none"
									stroke="rgba(243,255,241,0.12)"
									stroke-width="2"
									stroke-dasharray="4 6"
								/>

								<!-- Milestone Labels -->
								{#if currentPhase === 'pre_midnight'}
									<text x="36" y="145" text-anchor="middle" font-family="monospace" font-size="9" fill="#FFB84D" letter-spacing="0.1em">18:00 DUSK</text>
									<text x="180" y="14" text-anchor="middle" font-family="monospace" font-size="9" fill="#5f7662" letter-spacing="0.1em">WAITING</text>
									<text x="324" y="145" text-anchor="middle" font-family="monospace" font-size="9" fill="#FFB84D" letter-spacing="0.1em">00:00 MID</text>
								{:else}
									<text x="36" y="145" text-anchor="middle" font-family="monospace" font-size="9" fill="#5f7662" letter-spacing="0.1em">00:00 MID</text>
									<text x="180" y="14" text-anchor="middle" font-family="monospace" font-size="9" fill="#5f7662" letter-spacing="0.1em">ZENITH</text>
									<text x="324" y="145" text-anchor="middle" font-family="monospace" font-size="9" fill="#8ec765" letter-spacing="0.1em">{String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')} DAWN</text>
								{/if}

								<!-- Orbiting Celestial Glyph -->
								<g transform="translate({moonPos.x}, {moonPos.y})">
									<circle cx="0" cy="0" r="11" fill="#0c140f" stroke={currentPhase === 'pre_midnight' ? '#FFB84D' : '#8ec765'} stroke-width="1.5" />
									<circle cx="0" cy="0" r="4.5" fill={currentPhase === 'pre_midnight' ? '#FFB84D' : '#8ec765'} />
								</g>
							</svg>

							<!-- Centered Digital Readout inside Arc -->
							<div class="mt-2 text-center">
								<p class="num font-mono text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-cream">
									{left}
								</p>
								<p class="mt-1 text-[11px] font-mono tracking-widest uppercase {currentPhase === 'pre_midnight' ? 'text-amber' : 'text-lamp'}">
									{currentPhase === 'pre_midnight' ? 'countdown to midnight lock-in' : 'countdown to solar horizon'}
								</p>
							</div>
						</div>
					</div>
				{:else}
					<!-- STYLE 3: STUDIO TELEMETRY GRID (THEMED) -->
					<div class="flex flex-col">
						<div class="grid grid-cols-3 divide-x divide-cream/10 rounded-xl border bg-night/70 p-4 sm:p-5 {currentPhase === 'pre_midnight' ? 'border-amber/25' : 'border-lamp/25'}">
							<div class="flex flex-col items-center px-2">
								<span class="num font-mono text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-cream">{hStr}</span>
								<span class="mt-2 text-[10px] font-mono tracking-[0.2em] uppercase {currentPhase === 'pre_midnight' ? 'text-amber/80' : 'text-lamp/80'}">hours</span>
							</div>
							<div class="flex flex-col items-center px-2">
								<span class="num font-mono text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-cream">{mStr}</span>
								<span class="mt-2 text-[10px] font-mono tracking-[0.2em] uppercase {currentPhase === 'pre_midnight' ? 'text-amber/80' : 'text-lamp/80'}">minutes</span>
							</div>
							<div class="flex flex-col items-center px-2">
								<span class="num font-mono text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-cream/90">{sStr}</span>
								<span class="mt-2 text-[10px] font-mono tracking-[0.2em] uppercase {currentPhase === 'pre_midnight' ? 'text-amber/80' : 'text-lamp/80'}">seconds</span>
							</div>
						</div>

						<!-- 10-step Segmented LED Meter -->
						<div class="mt-5">
							<div class="flex items-center justify-between text-[11px] font-mono text-faint mb-2">
								<span class="uppercase tracking-wider {currentPhase === 'pre_midnight' ? 'text-amber' : 'text-lamp'}">
									{currentPhase === 'pre_midnight' ? 'warmup meter' : 'session telemetry'}
								</span>
								<span class="{currentPhase === 'pre_midnight' ? 'text-amber' : 'text-lamp'} font-medium">{Math.round(progress)}% elapsed</span>
							</div>
							<div class="flex gap-1.5 sm:gap-2">
								{#each Array(10) as _, i}
									<div
										class="h-2.5 flex-1 rounded-xs transition-colors duration-500 {i < Math.floor(progress / 10)
											? currentPhase === 'pre_midnight'
												? 'bg-amber/90 shadow-[0_0_6px_rgba(255,184,77,0.4)]'
												: 'bg-lamp/90 shadow-[0_0_6px_rgba(142,199,101,0.4)]'
											: 'bg-cream/10'}"
									></div>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Night Milestone Timeline Footer (Themed) -->
			<div class="border-t border-cream/10 pt-4 mt-2">
				<div class="relative mb-3">
					<!-- Track -->
					<div class="h-1.5 w-full rounded-full bg-cream/10 overflow-hidden">
						<div
							class="h-full transition-all duration-1000 ease-linear rounded-full {currentPhase === 'pre_midnight' ? 'bg-amber' : 'bg-lamp'}"
							style="width: {progress}%"
						></div>
					</div>

					<!-- Milestones -->
					<div class="mt-2 flex justify-between text-[10px] font-mono uppercase tracking-wider text-faint">
						{#if currentPhase === 'pre_midnight'}
							<span class="{progress >= 0 ? 'text-cream font-medium' : ''}">18:00 Sunset</span>
							<span class="{progress >= 33 ? 'text-cream font-medium' : ''}">20:00 Setup</span>
							<span class="{progress >= 66 ? 'text-cream font-medium' : ''}">22:00 Waiting</span>
							<span class="{progress >= 95 ? 'text-amber font-semibold' : ''}">00:00 Midnight</span>
						{:else}
							<span class="{progress >= 0 ? 'text-cream font-medium' : ''}">00:00 Mid</span>
							<span class="{progress >= 33 ? 'text-cream font-medium' : ''}">02:00 Deep</span>
							<span class="{progress >= 66 ? 'text-cream font-medium' : ''}">04:00 Witching</span>
							<span class="{progress >= 95 ? 'text-lamp font-semibold' : ''}">{String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')} Dawn</span>
						{/if}
					</div>
				</div>

				<div class="flex flex-wrap items-center justify-between gap-2 text-xs text-taupe pt-1">
					<span class="inline-flex items-center gap-1.5">
						{#if currentPhase === 'pre_midnight'}
							<IconFlame size={13} stroke={2} class="text-amber" />
							<span class="font-mono text-cream">{Math.round(progress)}% of pre-session completed</span>
						{:else}
							<IconSparkles size={13} stroke={1.5} class="text-lamp" />
							<span class="font-mono text-cream">{Math.round(progress)}% of night completed</span>
						{/if}
					</span>
					<span class="font-mono text-faint">
						{remainingText}
					</span>
				</div>
			</div>
		</div>
	{/if}
{:else}
	<!-- Compact variant (Room Sidebar) -->
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
				<p class="text-sm {currentPhase === 'pre_midnight' ? 'text-amber' : 'text-taupe'}">
					{currentPhase === 'pre_midnight' ? 'till doors open (00:00)' : 'till sunrise (06:00)'}
				</p>
				{#if currentPhase === 'session_active'}
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
				{/if}
			</div>

			<p class="num mt-2 text-4xl leading-none tracking-tight md:text-[2.6rem]" aria-label="countdown timer">
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
				<p class="num mt-2.5 text-xs {currentPhase === 'pre_midnight' ? 'text-amber/80' : 'text-faint'}">
					{currentPhase === 'pre_midnight' ? 'lock-in starts at 00:00 local' : `dawn at ${String(dawn.h).padStart(2, '0')}:${String(dawn.m).padStart(2, '0')} local`}
				</p>
			{/if}

			<div class="mt-4 border-t border-cream/8 pt-3">
				<div class="mb-1.5 flex items-center justify-between text-[11px] text-faint">
					<span>{currentPhase === 'pre_midnight' ? 'pre-session warmup' : 'night progress'}</span>
					<span class="num {currentPhase === 'pre_midnight' ? 'text-amber' : 'text-taupe'}">
						{Math.round(progress)}% {currentPhase === 'pre_midnight' ? 'to midnight' : 'to dawn'}
					</span>
				</div>
				<div class="progress-bar">
					<div
						class="progress-fill {currentPhase === 'pre_midnight' ? '!bg-amber' : ''}"
						style="width: {progress}%"
					></div>
				</div>
			</div>
		</div>
	{/if}
{/if}
