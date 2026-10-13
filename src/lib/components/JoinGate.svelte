<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import IconDoorEnter from '@tabler/icons-svelte/icons/door-enter';
	import IconCircleOff from '@tabler/icons-svelte/icons/circle-off';
	import IconClock from '@tabler/icons-svelte/icons/clock';

	function initial(name: string): string {
		return name.trim().charAt(0).toUpperCase() || '?';
	}

	const host = $derived(room.directory.find((entry) => entry.room === room.room)?.host || '');
	const inside = $derived(room.awake.filter((peer) => !peer.self));
</script>

<div class="mx-auto max-w-[560px]">
	{#if room.joinState === 'rejected'}
		<div class="panel flex flex-col items-center px-6 py-12 text-center md:px-8">
			<span class="grid h-12 w-12 place-items-center rounded-full bg-night/70 text-faint">
				<IconCircleOff size={22} stroke={1.5} />
			</span>
			<h2 class="mt-4 text-lg font-medium">Not this time</h2>
			<p class="mt-2 max-w-[36ch] text-xs leading-relaxed text-faint">
				The host of <span class="text-taupe">{room.title || room.room}</span> didn't open the door.
				Try another room, or open your own.
			</p>
			<button class="btn btn-ghost mt-6" onclick={() => room.leave()}>
				<IconArrowLeft size={15} stroke={1.5} />
				Back to rooms
			</button>
		</div>
	{:else}
		<div class="panel flex flex-col p-5 md:p-7">
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0">
					<h2 class="truncate text-base font-medium">{room.title || room.room}</h2>
					<p class="num mt-0.5 text-xs text-faint">
						room / {room.room}{host ? ` · host ${host}` : ''}
					</p>
				</div>
				<span class="soft-blink mt-1 h-2 w-2 shrink-0 rounded-full bg-lamp"></span>
			</div>

			<div class="mt-6 flex flex-col items-center rounded-field border border-dashed border-cream/15 px-6 py-10 text-center">
				<span class="grid h-11 w-11 place-items-center rounded-full bg-lamp/15 text-lamp">
					<IconClock size={20} stroke={1.5} />
				</span>
				<p class="mt-4 text-sm text-cream">Waiting at the door</p>
				<p class="mt-1.5 max-w-[34ch] text-xs leading-relaxed text-faint">
					Your ask is out. The crew inside decides who gets in.
				</p>
			</div>

			<div class="mt-5">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-medium">Inside now</h3>
					<span class="num text-xs text-faint">{inside.length}</span>
				</div>
				{#if inside.length > 0}
					<ul class="mt-3 flex flex-wrap gap-2">
						{#each inside as peer (peer.id)}
							<li
								class="flex items-center gap-2 rounded-full bg-night/60 py-1 pl-1 pr-3 text-sm ring-1 ring-cream/10"
							>
								<span
									class="grid h-6 w-6 place-items-center rounded-full bg-lamp/15 text-[11px] font-semibold text-lamp"
								>
									{initial(peer.name)}
								</span>
								<span class="text-taupe">{peer.name}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<div class="mt-3 rounded-field border border-cream/10 bg-night/40 p-4 text-center">
						<p class="num text-xs leading-relaxed text-faint">
							Nobody has the light on in this room yet.
						</p>
						<button
							class="btn btn-primary btn-sm mt-3"
							onclick={() => room.claimRoom(room.room, room.title)}
						>
							<IconDoorEnter size={14} stroke={1.5} />
							Step inside as host
						</button>
					</div>
				{/if}
			</div>

			<button class="btn btn-ghost mt-6 w-full" onclick={() => room.leave()}>
				<IconArrowLeft size={15} stroke={1.5} />
				Cancel and go back
			</button>
		</div>
	{/if}
</div>
