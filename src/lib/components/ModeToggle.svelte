<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import { siteAudio } from '#lib/audio/site-audio.svelte';
	import { playFocusChime, playBreakChime } from '#lib/audio/chime';
	import IconWaveSine from '@tabler/icons-svelte/icons/wave-sine';
	import IconTarget from '@tabler/icons-svelte/icons/target';
	import IconRepeat from '@tabler/icons-svelte/icons/repeat';
	import IconLock from '@tabler/icons-svelte/icons/lock';
	import IconLockOpen from '@tabler/icons-svelte/icons/lock-open';
	import IconWorld from '@tabler/icons-svelte/icons/world';
	import IconShield from '@tabler/icons-svelte/icons/shield';
	import IconMaximize from '@tabler/icons-svelte/icons/maximize';

	type RoomMode = 'normal' | 'focus' | 'break';

	const mode = $derived<RoomMode>(room.mode ?? 'normal');
	const isNormal = $derived(mode === 'normal' || mode === 'break');

	function setMode(next: RoomMode) {
		if (next === 'focus') {
			playFocusChime();
			siteAudio.play();
			window.dispatchEvent(new CustomEvent('an:open-desk-hud'));
		} else {
			playBreakChime();
			if (mode === 'focus') {
				siteAudio.pause();
			}
		}
		room.setMode(next);
	}

	function formatCountdown(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}
</script>

<div class="panel p-3 sm:p-3.5">
	<div class="mb-2 flex items-center justify-between">
		<p class="text-xs text-faint">Focus Mode</p>
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
		<div class="mb-2.5 h-1 w-full overflow-hidden rounded-full bg-cream/10">
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
			class="flex flex-col items-start gap-0.5 rounded border px-2.5 py-1.5 text-left text-xs transition-colors {isNormal
				? 'border-lamp/50 bg-lamp/10 text-lamp'
				: 'border-cream/10 bg-night/50 text-taupe hover:border-cream/20 hover:text-cream'}"
			onclick={() => setMode('normal')}
		>
			<span class="flex items-center gap-1 font-medium">
				<IconWaveSine size={13} stroke={2} />
				Normal
			</span>
			<span class="text-[10px] leading-tight opacity-75">Chat open · free aux</span>
		</button>

		<!-- 2. FOCUS SPRINT MODE -->
		<button
			type="button"
			class="flex flex-col items-start gap-0.5 rounded border px-2.5 py-1.5 text-left text-xs transition-colors {mode === 'focus'
				? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
				: 'border-cream/10 bg-night/50 text-taupe hover:border-cream/20 hover:text-cream'}"
			onclick={() => setMode('focus')}
		>
			<span class="flex items-center gap-1 font-medium">
				<IconTarget size={13} stroke={2} />
				Focus HUD (50m)
			</span>
			<span class="text-[10px] leading-tight opacity-75">Sprint · HUD Mode</span>
		</button>
	</div>

	{#if mode === 'focus'}
		<button
			type="button"
			class="btn btn-amber btn-sm w-full mt-2.5 text-xs py-1.5 flex items-center justify-center gap-1.5 shadow-sm font-mono tracking-wider uppercase text-[11px]"
			onclick={() => window.dispatchEvent(new CustomEvent('an:open-desk-hud'))}
			title="Open Fullscreen Focus HUD"
		>
			<IconMaximize size={13} stroke={1.5} />
			<span>Open Focus HUD</span>
		</button>
	{/if}

	{#if room.isHost}
		<div class="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-cream/10 pt-2">
			<button
				type="button"
				class="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono transition-colors {room.cycleAuto
					? 'border-lamp/40 bg-lamp/10 text-lamp'
					: 'border-cream/10 bg-night/40 text-taupe hover:text-cream'}"
				onclick={() => room.toggleAutoCycle()}
				title="Automatically switches between Focus sprints and Normal intervals for your session"
			>
				<IconRepeat size={11} stroke={1.5} />
				<span>Auto: {room.cycleAuto ? 'On' : 'Off'}</span>
			</button>

			<span
				class="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono {room.state.isPrivate
					? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
					: 'border-lamp/40 bg-lamp/10 text-lamp'}"
				title="Room privacy is locked upon creation and cannot be changed ({room.state.isPrivate ? 'Private' : 'Public'})"
			>
				{#if room.state.isPrivate}
					<IconLock size={11} stroke={1.5} />
					<span>Private</span>
				{:else}
					<IconWorld size={11} stroke={1.5} />
					<span>Public</span>
				{/if}
			</span>

			<button
				type="button"
				class="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono transition-colors {room.state.adminOnlyPlayback
					? 'border-teal-500/50 bg-teal-500/15 text-aqua-foam'
					: 'border-cream/10 bg-night/40 text-taupe hover:text-cream'}"
				onclick={() => room.setAdminOnlyPlayback(!room.state.adminOnlyPlayback)}
				title={room.state.adminOnlyPlayback ? 'Aux is Admin-only. Click to switch to No Admin (everyone).' : 'Aux has No Admin restriction. Click to switch to Admin-only.'}
			>
				<IconShield size={11} stroke={1.5} />
				<span>Aux: {room.state.adminOnlyPlayback ? 'Admin' : 'No Admin'}</span>
			</button>

			<button
				type="button"
				class="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono transition-colors {room.state.doorLocked
					? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
					: 'border-cream/10 bg-night/40 text-taupe hover:text-cream'}"
				onclick={() => room.toggleDoorLock()}
				title="Locking requires visitors to knock. Unlocked lets anyone enter immediately."
			>
				{#if room.state.doorLocked}
					<IconLock size={11} stroke={1.5} />
					<span>Locked</span>
				{:else}
					<IconLockOpen size={11} stroke={1.5} />
					<span>Open</span>
				{/if}
			</button>
		</div>
	{/if}
</div>
