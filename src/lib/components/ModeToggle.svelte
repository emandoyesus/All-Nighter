<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import IconTarget from '@tabler/icons-svelte/icons/target';
	import IconWaveSine from '@tabler/icons-svelte/icons/wave-sine';
	import IconRepeat from '@tabler/icons-svelte/icons/repeat';
	import IconLock from '@tabler/icons-svelte/icons/lock';
	import IconLockOpen from '@tabler/icons-svelte/icons/lock-open';

	type RoomMode = 'focus' | 'break';

	const mode = $derived<RoomMode>(room.mode ?? 'focus');

	function setMode(next: RoomMode) {
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
		<p class="text-xs text-faint">Room mode & cycle</p>
		{#if room.modeRemaining > 0}
			<span class="num text-[11px] font-medium {mode === 'focus' ? 'text-lamp' : ''}" style={mode === 'break' ? 'color: var(--color-amber)' : ''}>
				{formatCountdown(room.modeRemaining)} left
			</span>
		{/if}
	</div>

	<div class="grid grid-cols-2 gap-2">
		<button
			type="button"
			class="flex flex-col items-start gap-1.5 rounded-field border px-3 py-2.5 text-left text-xs transition-colors {mode === 'focus'
				? 'border-lamp/50 bg-lamp/10 text-lamp'
				: 'border-cream/10 bg-night/50 text-taupe hover:border-cream/20 hover:text-cream'}"
			onclick={() => setMode('focus')}
		>
			<span class="flex items-center gap-1.5 font-medium">
				<IconTarget size={13} stroke={2} />
				Focus (50m)
			</span>
			<span class="leading-snug opacity-75">Chat quiet · lock in</span>
		</button>

		<button
			type="button"
			class="flex flex-col items-start gap-1.5 rounded-field border px-3 py-2.5 text-left text-xs transition-colors {mode === 'break'
				? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
				: 'border-cream/10 bg-night/50 text-taupe hover:border-cream/20 hover:text-cream'}"
			style={mode === 'break' ? '--tw-text-opacity:1; color: var(--color-amber); border-color: color-mix(in srgb, var(--color-amber) 40%, transparent); background: color-mix(in srgb, var(--color-amber) 10%, transparent)' : ''}
			onclick={() => setMode('break')}
		>
			<span class="flex items-center gap-1.5 font-medium">
				<IconWaveSine size={13} stroke={2} />
				Break (10m)
			</span>
			<span class="leading-snug opacity-75">Floor open · unwind</span>
		</button>
	</div>

	{#if room.isHost}
		<div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-cream/10 pt-3">
			<button
				type="button"
				class="inline-flex items-center gap-1.5 rounded-field border px-2.5 py-1 text-[11px] transition-colors {room.state.cycleAuto
					? 'border-lamp/40 bg-lamp/10 text-lamp'
					: 'border-cream/10 bg-night/40 text-taupe hover:text-cream'}"
				onclick={() => room.toggleAutoCycle()}
				title="Automatically switches between 50m Focus and 10m Break with soft chimes"
			>
				<IconRepeat size={13} stroke={1.5} />
				<span>50/10 Auto-cycle: {room.state.cycleAuto ? 'On' : 'Off'}</span>
			</button>

			<button
				type="button"
				class="inline-flex items-center gap-1.5 rounded-field border px-2.5 py-1 text-[11px] transition-colors {room.state.doorLocked
					? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
					: 'border-cream/10 bg-night/40 text-taupe hover:text-cream'}"
				onclick={() => room.toggleDoorLock()}
				title="Locking requires visitors to knock. Unlocked lets anyone enter immediately."
			>
				{#if room.state.doorLocked}
					<IconLock size={13} stroke={1.5} />
					<span>Door: Locked</span>
				{:else}
					<IconLockOpen size={13} stroke={1.5} />
					<span>Door: Open to all</span>
				{/if}
			</button>
		</div>
	{/if}
</div>
