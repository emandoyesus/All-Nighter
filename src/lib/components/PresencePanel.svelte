<script lang="ts">
	import { room } from '#lib/room/room.svelte';

	function initial(name: string): string {
		return name.trim().charAt(0).toUpperCase() || '?';
	}
</script>

<div class="panel p-5">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-medium">Awake now</h3>
		<span class="num text-xs text-faint">{room.awake.length}</span>
	</div>

	<ul class="mt-3.5 flex flex-wrap gap-2">
		{#each room.awake as peer (peer.id)}
			<li
				class="flex items-center gap-2 rounded-full bg-night/60 py-1 pl-1 pr-3 text-sm ring-1 {peer.self
					? 'ring-lamp/50'
					: 'ring-cream/10'}"
			>
				<span
					class="grid h-6 w-6 place-items-center rounded-full bg-lamp/15 text-[11px] font-semibold text-lamp"
				>
					{initial(peer.name)}
				</span>
				<span class={peer.self ? 'text-cream' : 'text-taupe'}>{peer.name}</span>
			</li>
		{/each}
	</ul>

	<div class="mt-4">
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
</div>
