<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import { playFocusChime, playBreakChime } from '#lib/audio/chime';
	import IconWaveSine from '@tabler/icons-svelte/icons/wave-sine';
	import IconTarget from '@tabler/icons-svelte/icons/target';
	import IconRepeat from '@tabler/icons-svelte/icons/repeat';
	import IconLock from '@tabler/icons-svelte/icons/lock';
	import IconLockOpen from '@tabler/icons-svelte/icons/lock-open';

	type RoomMode = 'normal' | 'focus' | 'break';

	const mode = $derived<RoomMode>(room.mode ?? 'normal');
	const isNormal = $derived(mode === 'normal' || mode === 'break');

	function setMode(next: RoomMode) {
		if (next === 'focus') {
			playFocusChime();
		} else {
			playBreakChime();
		}
		room.setMode(next);
	}

	function formatCountdown(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}
</script>

<div class="panel p-4">
	<div class="mb-3 flex items-center justify-between">
		<p class="text-xs text-faint">Room Mode</p>
		{#if room.modeRemaining > 0}
			<span class="num text-[11px] font-medium {mode === 'focus' ? 'text-amber-300' : 'text-lamp'}">
				{formatCountdown(room.modeRemaining)} left
			</span>
		{:else}
			<span class="num text-[11px] font-medium text-lamp">
				{isNormal ? 'Normal active' : 'Focus active'}
			</span>
		{/if}
	</div>

	{#if room.modeRemaining > 0}
		<div class="mb-3 h-1 w-full overflow-hidden rounded-full bg-cream/10">
			<div
				class="h-full transition-all duration-1000 {mode === 'focus' ? 'bg-amber' : 'bg-lamp'}"
				style="width: {Math.min(100, Math.max(2, (1 - room.modeRemaining / (mode === 'focus' ? 3000 : 900)) * 100))}%"
			></div>
		</div>
	{/if}

	<!-- Prioritize Normal Mode on the left -->
	<div class="grid grid-cols-2 gap-2">
		<!-- 1. NORMAL MODE (PRIORITY / DEFAULT) -->
		<button
			type="button"
			class="flex flex-col items-start gap-1 rounded-field border px-3 py-2 text-left text-xs transition-colors {isNormal
				? 'border-lamp/50 bg-lamp/10 text-lamp'
				: 'border-cream/10 bg-night/50 text-taupe hover:border-cream/20 hover:text-cream'}"
			onclick={() => setMode('normal')}
		>
			<span class="flex items-center gap-1.5 font-medium">
				<IconWaveSine size={14} stroke={2} />
				Normal
			</span>
			<span class="text-[11px] leading-snug opacity-75">Chat open · free aux</span>
		</button>

		<!-- 2. FOCUS SPRINT MODE -->
		<button
			type="button"
			class="flex flex-col items-start gap-1 rounded-field border px-3 py-2 text-left text-xs transition-colors {mode === 'focus'
				? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
				: 'border-cream/10 bg-night/50 text-taupe hover:border-cream/20 hover:text-cream'}"
			onclick={() => setMode('focus')}
		>
			<span class="flex items-center gap-1.5 font-medium">
				<IconTarget size={14} stroke={2} />
				Focus (50m)
			</span>
			<span class="text-[11px] leading-snug opacity-75">Quiet sprint · lock in</span>
		</button>
	</div>

	{#if room.isHost}
		<div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-cream/10 pt-2.5">
			<button
				type="button"
				class="inline-flex items-center gap-1.5 rounded-field border px-2 py-1 text-[11px] transition-colors {room.state.cycleAuto
					? 'border-lamp/40 bg-lamp/10 text-lamp'
					: 'border-cream/10 bg-night/40 text-taupe hover:text-cream'}"
				onclick={() => room.toggleAutoCycle()}
				title="Automatically switches between Focus sprints and Normal intervals"
			>
				<IconRepeat size={12} stroke={1.5} />
				<span>Auto-cycle: {room.state.cycleAuto ? 'On' : 'Off'}</span>
			</button>

			<button
				type="button"
				class="inline-flex items-center gap-1.5 rounded-field border px-2 py-1 text-[11px] transition-colors {room.state.doorLocked
					? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
					: 'border-cream/10 bg-night/40 text-taupe hover:text-cream'}"
				onclick={() => room.toggleDoorLock()}
				title="Locking requires visitors to knock. Unlocked lets anyone enter immediately."
			>
				{#if room.state.doorLocked}
					<IconLock size={12} stroke={1.5} />
					<span>Door: Locked</span>
				{:else}
					<IconLockOpen size={12} stroke={1.5} />
					<span>Door: Open</span>
				{/if}
			</button>
		</div>
	{/if}
</div>
