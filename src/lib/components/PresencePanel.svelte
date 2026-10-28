<script lang="ts">
	import { room } from '#lib/room/room.svelte';

	function initial(name: string): string {
		return name.trim().charAt(0).toUpperCase() || '?';
	}

	function peerClock(tz: string | undefined): { time: string; badge: string; icon: string } | null {
		if (!tz) return null;
		try {
			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: tz,
				hour: 'numeric',
				minute: '2-digit',
				hour12: false
			});
			const parts = formatter.formatToParts(new Date(room.now));
			const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
			const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
			const time = `${String(hour).padStart(2, '0')}:${minute}`;

			if (hour >= 23 || hour < 5) {
				return { time, badge: 'deep night', icon: '🌙' };
			}
			if (hour >= 5 && hour < 7) {
				return { time, badge: 'dawn', icon: '🌅' };
			}
			if (hour >= 21 || hour < 23) {
				return { time, badge: 'night', icon: '🌆' };
			}
			return { time, badge: 'daylight', icon: '☀️' };
		} catch {
			return null;
		}
	}
</script>

<div class="panel p-5">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-medium">Awake now</h3>
		<span class="num text-xs text-faint">{room.awake.length}</span>
	</div>

	<!-- Roster with intentions & local time -->
	<ul class="mt-3.5 space-y-2">
		{#each room.awake as peer (peer.id)}
			{@const pClock = peerClock(peer.tz)}
			<li class="flex items-start gap-2">
				<span
					class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lamp/15 text-[11px] font-semibold text-lamp"
				>
					{initial(peer.name)}
				</span>
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-1.5">
						<span class="text-sm {peer.self ? 'text-cream font-medium' : 'text-taupe'}">{peer.name}</span>
						{#if peer.status}
							<span class="rounded-full bg-cream/8 px-1.5 py-0.5 text-[11px] text-lamp">{peer.status}</span>
						{/if}
						{#if pClock}
							<span
								class="num inline-flex items-center gap-1 rounded bg-night/80 px-1.5 py-0.5 text-[10px] text-faint ring-1 ring-cream/10"
								title={`${pClock.badge} for ${peer.name}`}
							>
								<span>{pClock.icon}</span>
								<span>{pClock.time}</span>
							</span>
						{/if}
					</div>
					{#if peer.intention}
						<p class="mt-0.5 truncate text-[11px] italic text-faint/80">{peer.intention}</p>
					{/if}
				</div>
			</li>
		{/each}
	</ul>

	<!-- Your callsign -->
	<div class="mt-4 border-t border-cream/10 pt-4">
		<label for="callsign" class="mb-1.5 block text-xs text-faint">Your callsign</label>
		<input
			id="callsign"
			type="text"
			maxlength="24"
			autocomplete="off"
			class="w-full rounded-field border border-cream/10 bg-night/60 px-3 py-2 text-sm text-cream outline-none transition-colors focus:border-lamp/60"
			value={room.name}
			oninput={(e) => room.setName(e.currentTarget.value)}
		/>
	</div>

	<!-- Tonight's intention -->
	<div class="mt-3">
		<label for="intention" class="mb-1.5 block text-xs text-faint">What are you working on tonight?</label>
		<input
			id="intention"
			type="text"
			maxlength="80"
			autocomplete="off"
			placeholder="one line is enough"
			class="w-full rounded-field border border-cream/10 bg-night/60 px-3 py-2 text-sm text-cream outline-none transition-colors placeholder:text-faint/60 focus:border-lamp/60"
			value={room.intention}
			oninput={(e) => room.setIntention(e.currentTarget.value)}
		/>
	</div>

	<!-- Mood / status chips -->
	<div class="mt-3.5">
		<span class="mb-1.5 block text-xs text-faint">Your mood</span>
		<div class="flex flex-wrap gap-1.5">
			{#each ['🎧 Locked in', '☕ Coffee run', '🐛 Bug hunting', '🥱 4am wall'] as mood}
				<button
					type="button"
					class="rounded-full px-2.5 py-1 text-xs transition-colors border {room.statusText === mood
						? 'border-lamp bg-lamp/15 text-lamp font-medium'
						: 'border-cream/10 bg-night/50 text-taupe hover:border-cream/25 hover:text-cream'}"
					onclick={() => room.setStatus(room.statusText === mood ? '' : mood)}
				>
					{mood}
				</button>
			{/each}
		</div>
	</div>
</div>
