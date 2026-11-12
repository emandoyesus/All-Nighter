<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import IconArrowLeft from '@tabler/icons-svelte/icons/arrow-left';
	import IconCircleOff from '@tabler/icons-svelte/icons/circle-off';
	import IconClock from '@tabler/icons-svelte/icons/clock';
	import IconLock from '@tabler/icons-svelte/icons/lock';
	import IconKey from '@tabler/icons-svelte/icons/key';

	function initial(name: string): string {
		return name.trim().charAt(0).toUpperCase() || '?';
	}

	let inputKey = $state('');
	let keyError = $state('');
	let checking = $state(false);

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
				{#if room.state.isPrivate}
					<span class="grid h-11 w-11 place-items-center rounded-full bg-amber-400/15 text-amber-300">
						<IconLock size={20} stroke={1.5} />
					</span>
					<p class="mt-4 text-sm text-cream font-medium">Private Room · Waiting for approval</p>
					<p class="mt-1.5 max-w-[34ch] text-xs leading-relaxed text-faint">
						This room is private. You knocked at the door — music, queue, and chat remain locked until a host lets you in.
					</p>
				{:else}
					<span class="grid h-11 w-11 place-items-center rounded-full bg-lamp/15 text-lamp">
						<IconClock size={20} stroke={1.5} />
					</span>
					<p class="mt-4 text-sm text-cream">Waiting at the door</p>
					<p class="mt-1.5 max-w-[34ch] text-xs leading-relaxed text-faint">
						Your ask is out. The crew inside decides who gets in.
					</p>
				{/if}
			</div>

			{#if room.state.isPrivate}
				<div class="mt-4 rounded-xl border border-cream/10 bg-[#060a0b] p-3.5 text-left">
					<div class="flex items-center gap-1.5 mb-2 text-xs font-mono text-amber-300">
						<IconKey size={13} stroke={2} />
						<span>Have the Secret Room Key?</span>
					</div>
					<form
						class="flex items-center gap-2"
						onsubmit={async (e) => {
							e.preventDefault();
							if (!inputKey.trim() || checking) return;
							checking = true;
							keyError = '';
							const ok = await room.unlockWithKey(inputKey);
							checking = false;
							if (!ok) {
								keyError = 'Invalid room key. Check your link or ask the host.';
							}
						}}
					>
						<input
							type="text"
							placeholder="Enter secret room key"
							bind:value={inputKey}
							class="flex-1 rounded-lg border border-cream/15 bg-night/80 px-3 py-1.5 text-xs text-cream font-mono outline-none focus:border-amber-400/60"
						/>
						<button
							type="submit"
							disabled={checking || !inputKey.trim()}
							class="btn btn-secondary btn-sm text-xs font-mono shrink-0 border-amber-400/40 text-amber-300 hover:text-cream disabled:opacity-50"
						>
							{checking ? 'Checking...' : 'Unlock'}
						</button>
					</form>
					{#if keyError}
						<p class="mt-1.5 text-[11px] text-red-400 font-mono">{keyError}</p>
					{/if}
				</div>
			{/if}

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
							{host ? `Host ${host} stepped out. Room is currently quiet.` : 'Nobody has the light on in this room yet.'}
						</p>
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
