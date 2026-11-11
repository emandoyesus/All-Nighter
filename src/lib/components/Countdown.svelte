<script lang="ts">
	import { onMount } from 'svelte';
	import { DAWN, SUNSET, areDoorsOpen } from '#lib/config';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import IconPencil from '@tabler/icons-svelte/icons/pencil';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconSparkles from '@tabler/icons-svelte/icons/sparkles';
	import IconFlame from '@tabler/icons-svelte/icons/flame';
	import IconBolt from '@tabler/icons-svelte/icons/bolt';

	type CountdownPhase = 'pre_sunset' | 'session_active' | 'sunrise';
	type PhaseMode = 'auto' | 'pre_sunset' | 'session_active';

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
					if (parsed.h === 6 && parsed.m === 30) {
						return { ...DAWN };
					}
					return { h: parsed.h, m: parsed.m };
				}
			}
		} catch {}
		return { ...DAWN };
	}

	function loadPhaseMode(): PhaseMode {
		try {
			if (typeof window !== 'undefined') {
				const params = new URLSearchParams(window.location.search);
				const p = params.get('phase');
				if (p === 'pre_sunset' || p === 'session_active' || p === 'pre_midnight') {
					return p === 'pre_midnight' ? 'pre_sunset' : (p as PhaseMode);
				}
			}
		} catch {}
		return 'auto';
	}

	let dawn = $state(loadDawn());
	let phaseMode = $state<PhaseMode>(loadPhaseMode());
	let currentPhase = $state<CountdownPhase>('pre_sunset');

	let editing = $state(false);
	let editH = $state(0);
	let editM = $state(0);
	let left = $state('--:--:--');
	let isSunrise = $state(false);
	let progress = $state(0);

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

		// Doors open at sunset (18:00) until morning dawn (default 06:00)
		const isSessionHours = areDoorsOpen(now);

		const autoPhase: CountdownPhase = isSessionHours ? 'session_active' : 'pre_sunset';
		currentPhase = phaseMode === 'auto' ? autoPhase : phaseMode;

		if (currentPhase === 'pre_sunset') {
			// COUNTDOWN 1: WAITING FOR SUNSET (18:00 Doors Open)
			const sunset = new Date(now);
			sunset.setHours(SUNSET.h, SUNSET.m, 0, 0);
			if (now.getTime() >= sunset.getTime()) {
				sunset.setDate(sunset.getDate() + 1);
			}
			const remainingMs = Math.max(0, sunset.getTime() - now.getTime());
			left = format(remainingMs);

			// Daytime window from morning Dawn (06:00) to Sunset (18:00) - 12 hours
			const dayStart = new Date(todayDawn);
			if (now.getTime() < dayStart.getTime()) {
				dayStart.setDate(dayStart.getDate() - 1);
			}
			const totalPrepMs = Math.max(1000, sunset.getTime() - dayStart.getTime());
			const elapsedMs = Math.max(0, now.getTime() - dayStart.getTime());
			progress = Math.min(100, Math.max(0, (elapsedMs / totalPrepMs) * 100));
		} else {
			// COUNTDOWN 2: ACTIVE SESSION TILL DAWN (Session Finish)
			const nextDawn = new Date(todayDawn);
			if (now.getTime() >= todayDawn.getTime()) {
				nextDawn.setDate(nextDawn.getDate() + 1);
			}
			const remainingMs = Math.max(0, nextDawn.getTime() - now.getTime());
			left = format(remainingMs);

			// Night window from Sunset (18:00) to Dawn (06:00) - 12 hours
			const nightStart = new Date(nextDawn);
			nightStart.setDate(nightStart.getDate() - 1);
			nightStart.setHours(SUNSET.h, SUNSET.m, 0, 0);
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
		if (currentPhase === 'pre_sunset') {
			if (h === 0) return `${m}m to sunset`;
			return `${h}h ${m}m to sunset`;
		} else {
			if (h === 0) return `${m}m till dawn`;
			return `${h}h ${m}m till dawn`;
		}
	});

	onMount(() => {
		dawn = loadDawn();
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
				<span class="inline-flex items-center gap-2 rounded-full border border-amber/35 bg-amber/15 px-3 py-1 text-xs font-medium text-amber">
					<IconSun size={16} stroke={2} />
					Sunrise reached
				</span>
				<span class="num text-xs text-amber-200/70">
					{String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')} local dawn
				</span>
			</div>

			<div class="my-auto py-6">
				<p class="num font-mono text-xs uppercase tracking-[0.25em] text-amber-200/80">session complete</p>
				<h2 class="mt-2 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-cream">
					You made it through the night.
				</h2>
				<p class="mt-3 max-w-[42ch] text-sm leading-relaxed text-taupe">
					The sky is turning orange. The session has come to an end. Every track and intention was logged.
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-3 pt-4 border-t border-cream/10">
				<a href="/archive" class="btn btn-amber">
					View the archive
				</a>
				<button class="btn btn-ghost text-sm" onclick={() => (isSunrise = false)}>
					Dismiss
				</button>
			</div>
		</div>
	{:else}
		<div class="relative flex flex-col justify-center gap-5 sm:gap-6">
			<!-- Header with Phase Indicator & Style Controls -->
			<div class="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-cream/10">
				<!-- Phase Status & Identity -->
				<div class="flex items-center gap-2.5">
					<span class="h-2 w-2 rounded-full bg-lamp"></span>
					<div>
						<div class="flex items-center gap-1.5">
							{#if currentPhase === 'pre_sunset'}
								<p class="num text-[10px] font-mono uppercase tracking-[0.22em] text-lamp font-semibold">Doors open at sunset (18:00)</p>
								<span class="text-faint/60">·</span>
								<p class="text-xs font-medium text-cream">Countdown to session</p>
							{:else}
								<p class="num text-[10px] font-mono uppercase tracking-[0.22em] text-lamp font-semibold">Session live</p>
								<span class="text-faint/60">·</span>
								<p class="text-xs font-medium text-cream">Lock-in till sunrise</p>
							{/if}
						</div>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<!-- Target Pill -->
					{#if !editing}
						{#if currentPhase === 'pre_sunset'}
							<span class="inline-flex items-center gap-1 rounded-full border border-lamp/25 bg-lamp/10 px-2.5 py-1 text-xs text-lamp font-mono">
								<span>18:00</span>
								<span class="text-[10px] uppercase tracking-wider text-lamp/80">sunset</span>
							</span>
						{:else}
							<button
								class="inline-flex items-center gap-1.5 rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 text-xs text-amber font-mono transition-colors hover:border-amber/50"
								onclick={() => {
									editing = true;
									editH = dawn.h;
									editM = dawn.m;
								}}
								title="Customize dawn target time"
								aria-label="Customize dawn time"
							>
								<span>{String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')}</span>
								<span class="text-[10px] uppercase tracking-wider text-amber-200/80">dawn</span>
								<IconPencil size={11} stroke={1.5} class="text-amber/70 ml-0.5" />
							</button>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Dynamic Phase Alert Banner (Transforms when session starts) -->
			<div class="flex items-center">
				{#if currentPhase === 'pre_sunset'}
					<div class="inline-flex items-center gap-2 rounded-full border border-lamp/25 bg-lamp/10 px-3 py-1 text-xs text-cream">
						<IconFlame size={13} stroke={2} class="text-lamp" />
						<span>Pre-session countdown: doors unlock tonight at <strong class="text-lamp font-mono font-medium">18:00 sunset</strong></span>
					</div>
				{:else}
					<div class="inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-3 py-1 text-xs text-cream">
						<IconBolt size={13} stroke={2} class="text-amber" />
						<span>All-nighter in progress: locked in until <strong class="text-amber font-mono font-medium">{String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')} dawn</strong></span>
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
				{:else}
					<!-- MECHANICAL SPLIT-FLAP CARDS -->
					<div class="flex flex-col items-center">
						<div class="grid w-full grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1.5 sm:gap-3 max-w-[460px]">
							<!-- Hours Tile -->
							<div class="flex flex-col items-center">
								<div class="group relative flex aspect-[4/5] sm:aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-lamp/20 bg-gradient-to-b from-[#141414] via-[#0e0e0e] to-[#080808] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.6)]">
									<!-- Upper plate highlight -->
									<div class="absolute inset-x-0 top-0 h-1/2 border-b border-black/80 bg-white/[0.02]"></div>
									<!-- Lower plate subtle shadow -->
									<div class="absolute inset-x-0 bottom-0 h-1/2 border-t border-lamp/[0.08] bg-black/20"></div>

									<!-- Split-flap hinge notches -->
									<span class="absolute -left-1 top-1/2 h-2 w-1.5 -translate-y-1/2 rounded-r-sm border-r border-lamp/30 bg-night-2"></span>
									<span class="absolute -right-1 top-1/2 h-2 w-1.5 -translate-y-1/2 rounded-l-sm border-l border-lamp/30 bg-night-2"></span>

									<!-- Numerals -->
									<span class="relative z-10 select-none font-mono text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-cream">
										{hStr}
									</span>
								</div>
								<span class="mt-2.5 font-mono text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.25em] text-faint">hours</span>
							</div>

							<!-- Colon dots -->
							<div class="flex flex-col items-center justify-center gap-2 pb-5 sm:pb-6" aria-hidden="true">
								<span class="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-lamp/80"></span>
								<span class="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-lamp/80"></span>
							</div>

							<!-- Minutes Tile -->
							<div class="flex flex-col items-center">
								<div class="group relative flex aspect-[4/5] sm:aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-lamp/20 bg-gradient-to-b from-[#141414] via-[#0e0e0e] to-[#080808] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.6)]">
									<div class="absolute inset-x-0 top-0 h-1/2 border-b border-black/80 bg-white/[0.02]"></div>
									<div class="absolute inset-x-0 bottom-0 h-1/2 border-t border-lamp/[0.08] bg-black/20"></div>

									<span class="absolute -left-1 top-1/2 h-2 w-1.5 -translate-y-1/2 rounded-r-sm border-r border-lamp/30 bg-night-2"></span>
									<span class="absolute -right-1 top-1/2 h-2 w-1.5 -translate-y-1/2 rounded-l-sm border-l border-lamp/30 bg-night-2"></span>

									<span class="relative z-10 select-none font-mono text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-cream">
										{mStr}
									</span>
								</div>
								<span class="mt-2.5 font-mono text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.25em] text-faint">minutes</span>
							</div>

							<!-- Colon dots -->
							<div class="flex flex-col items-center justify-center gap-2 pb-5 sm:pb-6" aria-hidden="true">
								<span class="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-lamp/80"></span>
								<span class="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-lamp/80"></span>
							</div>

							<!-- Seconds Tile -->
							<div class="flex flex-col items-center">
								<div class="group relative flex aspect-[4/5] sm:aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-lamp/20 bg-gradient-to-b from-[#141414] via-[#0e0e0e] to-[#080808] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.6)]">
									<div class="absolute inset-x-0 top-0 h-1/2 border-b border-black/80 bg-white/[0.02]"></div>
									<div class="absolute inset-x-0 bottom-0 h-1/2 border-t border-lamp/[0.08] bg-black/20"></div>

									<span class="absolute -left-1 top-1/2 h-2 w-1.5 -translate-y-1/2 rounded-r-sm border-r border-lamp/30 bg-night-2"></span>
									<span class="absolute -right-1 top-1/2 h-2 w-1.5 -translate-y-1/2 rounded-l-sm border-l border-lamp/30 bg-night-2"></span>

									<span class="relative z-10 select-none font-mono text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-cream/90">
										{sStr}
									</span>
								</div>
								<span class="mt-2.5 font-mono text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.25em] text-faint">seconds</span>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Night Milestone Timeline Footer -->
			<div class="border-t border-cream/10 pt-4 mt-2">
				<div class="relative py-1">
					<!-- Precision Telemetry Track with border and glowing head -->
					<div class="relative h-2.5 w-full rounded-full bg-night-3 border border-cream/15 p-[2px] overflow-hidden shadow-inner">
						<!-- Hash tick marks across the track -->
						<div class="absolute inset-0 flex justify-between px-[25%] pointer-events-none z-10 opacity-30">
							<span class="w-px h-full bg-cream/30"></span>
							<span class="w-px h-full bg-cream/30"></span>
						</div>

						<!-- Gradient Fill -->
						<div
							class="relative h-full rounded-full bg-gradient-to-r from-cyber-teal via-lamp to-amber transition-all duration-700 ease-out"
							style="width: {Math.max(1.5, Math.min(100, progress))}%"
						>
							<!-- Luminous leading edge pip -->
							<div class="absolute right-0 top-0 bottom-0 w-2 rounded-full bg-white/90 shadow-sm"></div>
						</div>
					</div>

					<!-- Milestones -->
					<div class="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-wider text-faint">
						{#if currentPhase === 'pre_sunset'}
							<div class="flex flex-col items-start gap-0.5">
								<span class="flex items-center gap-1.5 {progress >= 0 ? 'text-lamp font-medium' : ''}">
									<span class="h-1.5 w-1.5 rounded-full {progress >= 0 ? 'bg-lamp' : 'bg-cream/20'}"></span>
									<span>{String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')}</span>
								</span>
								<span class="text-[9px] text-faint/80 pl-3">Dawn</span>
							</div>
							<div class="flex flex-col items-center gap-0.5">
								<span class="flex items-center gap-1.5 {progress >= 33 ? 'text-lamp font-medium' : ''}">
									<span class="h-1.5 w-1.5 rounded-full {progress >= 33 ? 'bg-lamp' : 'bg-cream/20'}"></span>
									<span>10:00</span>
								</span>
								<span class="text-[9px] text-faint/80">Morning</span>
							</div>
							<div class="flex flex-col items-center gap-0.5">
								<span class="flex items-center gap-1.5 {progress >= 66 ? 'text-lamp font-medium' : ''}">
									<span class="h-1.5 w-1.5 rounded-full {progress >= 66 ? 'bg-lamp' : 'bg-cream/20'}"></span>
									<span>14:00</span>
								</span>
								<span class="text-[9px] text-faint/80">Afternoon</span>
							</div>
							<div class="flex flex-col items-end gap-0.5">
								<span class="flex items-center gap-1.5 {progress >= 95 ? 'text-amber font-semibold' : ''}">
									<span class="h-1.5 w-1.5 rounded-full {progress >= 95 ? 'bg-amber soft-blink' : 'bg-cream/20'}"></span>
									<span>18:00</span>
								</span>
								<span class="text-[9px] text-faint/80 pr-3">Sunset</span>
							</div>
						{:else}
							<div class="flex flex-col items-start gap-0.5">
								<span class="flex items-center gap-1.5 {progress >= 0 ? 'text-lamp font-medium' : ''}">
									<span class="h-1.5 w-1.5 rounded-full {progress >= 0 ? 'bg-lamp' : 'bg-cream/20'}"></span>
									<span>18:00</span>
								</span>
								<span class="text-[9px] text-faint/80 pl-3">Doors Open</span>
							</div>
							<div class="flex flex-col items-center gap-0.5">
								<span class="flex items-center gap-1.5 {progress >= 33 ? 'text-lamp font-medium' : ''}">
									<span class="h-1.5 w-1.5 rounded-full {progress >= 33 ? 'bg-lamp' : 'bg-cream/20'}"></span>
									<span>22:00</span>
								</span>
								<span class="text-[9px] text-faint/80">Nightfall</span>
							</div>
							<div class="flex flex-col items-center gap-0.5">
								<span class="flex items-center gap-1.5 {progress >= 66 ? 'text-lamp font-medium' : ''}">
									<span class="h-1.5 w-1.5 rounded-full {progress >= 66 ? 'bg-lamp' : 'bg-cream/20'}"></span>
									<span>02:00</span>
								</span>
								<span class="text-[9px] text-faint/80">Deep Night</span>
							</div>
							<div class="flex flex-col items-end gap-0.5">
								<span class="flex items-center gap-1.5 {progress >= 95 ? 'text-amber font-semibold' : ''}">
									<span class="h-1.5 w-1.5 rounded-full {progress >= 95 ? 'bg-amber soft-blink' : 'bg-cream/20'}"></span>
									<span>{String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')}</span>
								</span>
								<span class="text-[9px] text-faint/80 pr-3">Dawn</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Telemetry Status Badges -->
				<div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-cream/8 font-mono text-xs">
					<div class="flex items-center gap-2">
						<span class="inline-flex items-center gap-1.5 rounded-full border border-lamp/30 bg-lamp/10 px-2.5 py-0.5 text-[11px] text-lamp font-medium">
							<span class="h-1.5 w-1.5 rounded-full bg-lamp {currentPhase === 'session_active' ? 'soft-blink' : ''}"></span>
							{Math.round(progress)}% complete
						</span>
						<span class="text-faint text-[11px] hidden sm:inline">
							{currentPhase === 'pre_sunset' ? 'daytime prep' : 'night session'}
						</span>
					</div>
					<div class="flex items-center gap-2 text-taupe text-[11px]">
						<span class="text-cream font-medium">{remainingText}</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
{:else}
	<!-- Compact variant (Room Sidebar) -->
	{#if isSunrise}
		<div class="panel border-amber/40 bg-gradient-to-b from-night-3 to-[#17120a] p-5 shadow-lg">
			<div class="flex items-center justify-between">
				<span class="inline-flex items-center gap-1.5 rounded-full border border-amber/35 bg-amber/15 px-2.5 py-0.5 text-xs font-medium text-amber">
					<IconSun size={15} stroke={2} />
					Sunrise reached
				</span>
				<span class="num text-xs text-amber-200/70">{String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')} local</span>
			</div>

			<h3 class="mt-3 text-xl font-semibold text-cream">You made it through the night.</h3>
			<p class="mt-1 text-xs leading-relaxed text-taupe">
				The sky is turning orange. The all-nighter is logged.
			</p>

			<div class="mt-4 flex items-center gap-2">
				<a href="/archive" class="btn btn-amber btn-sm">
					View the archive
				</a>
				<button class="btn btn-ghost btn-sm text-xs" onclick={() => (isSunrise = false)}>
					Dismiss
				</button>
			</div>
		</div>
	{:else}
		<div class="panel p-3.5 sm:p-4">
			<div class="flex items-center justify-between">
				<p class="text-xs text-taupe font-mono">
					{#if currentPhase === 'pre_sunset'}
						till sunset (18:00)
					{:else}
						till <span class="text-amber font-medium">sunrise ({String(dawn.h).padStart(2, '0')}:{String(dawn.m).padStart(2, '0')})</span>
					{/if}
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
						<IconPencil size={12} stroke={1.5} />
					</button>
				{/if}
			</div>

			<p class="num mt-1 text-2xl sm:text-3xl font-semibold leading-none tracking-tight text-cream" aria-label="countdown timer">
				{left}
			</p>

			{#if editing}
				<form class="mt-2 flex items-center gap-2 border-t border-cream/10 pt-2" onsubmit={(e) => { e.preventDefault(); saveDawn(); }}>
					<span class="text-[11px] text-faint">Target:</span>
					<input
						type="number"
						min="0"
						max="23"
						class="w-10 rounded border border-cream/15 bg-night/80 px-1 py-0.5 num text-xs text-cream outline-none focus:border-lamp"
						bind:value={editH}
					/>
					<span class="text-xs text-faint">:</span>
					<input
						type="number"
						min="0"
						max="59"
						class="w-10 rounded border border-cream/15 bg-night/80 px-1 py-0.5 num text-xs text-cream outline-none focus:border-lamp"
						bind:value={editM}
					/>
					<button type="submit" class="icon-btn text-lamp hover:text-cream" title="Save time" aria-label="Save time">
						<IconCheck size={13} stroke={2} />
					</button>
				</form>
			{/if}

			<div class="mt-2.5 border-t border-cream/8 pt-2">
				<div class="mb-1 flex items-center justify-between font-mono text-[10px]">
					<span class="inline-flex items-center gap-1 text-faint">
						<span class="h-1.5 w-1.5 rounded-full bg-lamp {currentPhase === 'session_active' ? 'soft-blink' : ''}"></span>
						<span>{currentPhase === 'pre_sunset' ? 'Daytime prep' : 'Night timeline'}</span>
					</span>
					<span class="text-cream font-medium">
						{Math.round(progress)}% · {remainingText}
					</span>
				</div>

				<!-- Upgraded Telemetry Bar -->
				<div class="relative h-1.5 w-full rounded-full bg-night-3 border border-cream/15 overflow-hidden">
					<div
						class="relative h-full rounded-full bg-gradient-to-r from-cyber-teal via-lamp to-amber transition-all duration-700 ease-out"
						style="width: {Math.max(2, Math.min(100, progress))}%"
					></div>
				</div>
			</div>
		</div>
	{/if}
{/if}
