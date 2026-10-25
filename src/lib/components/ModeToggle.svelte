<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import IconTarget from '@tabler/icons-svelte/icons/target';
	import IconWaveSine from '@tabler/icons-svelte/icons/wave-sine';

	/** The current room mode, stored as a simple string in the room title suffix.
	 *  This is intentionally lightweight — no new MQTT topics needed.
	 *  The host publishes a state update that includes the mode in the room log. */
	type RoomMode = 'focus' | 'break';

	const mode = $derived<RoomMode>(room.mode ?? 'focus');

	function setMode(next: RoomMode) {
		if (next === mode) return;
		room.setMode(next);
	}
</script>

<div class="panel p-4">
	<p class="mb-3 text-xs text-faint">Room mode</p>
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
				Focus
			</span>
			<span class="leading-snug opacity-75">Chat muted · calm queue</span>
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
				Break
			</span>
			<span class="leading-snug opacity-75">Aux open · dedications on</span>
		</button>
	</div>
</div>
