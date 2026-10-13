<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconUserPlus from '@tabler/icons-svelte/icons/user-plus';
</script>

{#if room.pending.length > 0}
	<div class="panel border-lamp/25 p-5">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2 text-lamp">
				<IconUserPlus size={16} stroke={1.5} />
				<h3 class="text-sm font-medium text-cream">Asking to join</h3>
			</div>
			<span class="num text-xs text-lamp">{room.pending.length}</span>
		</div>

		<ul class="mt-3.5 space-y-2">
			{#each room.pending as req (req.id)}
				<li class="flex items-center justify-between gap-3 rounded-field bg-night/50 px-3 py-2">
					<span class="truncate text-sm text-taupe">{req.name}</span>
					<span class="flex shrink-0 gap-1.5">
						<button
							class="grid h-7 w-7 place-items-center rounded-full bg-lamp/15 text-lamp transition-colors hover:bg-lamp/25"
							title="Let {req.name} in"
							aria-label="Accept {req.name}"
							onclick={() => room.approve(req.id)}
						>
							<IconCheck size={15} stroke={2} />
						</button>
						<button
							class="grid h-7 w-7 place-items-center rounded-full bg-night/70 text-faint transition-colors hover:text-cream"
							title="Turn {req.name} away"
							aria-label="Reject {req.name}"
							onclick={() => room.reject(req.id)}
						>
							<IconX size={15} stroke={2} />
						</button>
					</span>
				</li>
			{/each}
		</ul>
	</div>
{/if}
