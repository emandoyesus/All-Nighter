<script lang="ts">
	import { room } from '#lib/room/room.svelte';
	import IconSend from '@tabler/icons-svelte/icons/send-2';

	let draft = $state('');
	let list: HTMLUListElement | undefined = $state();

	const messages = $derived(room.state.chat ?? []);

	function send(e: Event): void {
		e.preventDefault();
		if (!draft.trim()) return;
		room.sendChat(draft);
		draft = '';
		queueMicrotask(() => {
			if (list) list.scrollTop = list.scrollHeight;
		});
	}

	function clock(ts: number): string {
		try {
			return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} catch {
			return '';
		}
	}

	function formatCountdown(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}
</script>

<div class="panel flex min-h-[280px] flex-1 flex-col p-5">
	<div class="flex items-center justify-between gap-3">
		<h3 class="text-sm font-medium">Late-night chat</h3>
		<span class="num text-xs text-faint">{messages.length}</span>
	</div>

	<!-- Mode status indicator -->
	{#if room.mode === 'focus'}
		<div class="mt-2.5 flex items-center justify-between rounded-field border border-lamp/30 bg-lamp/5 px-3 py-1.5 text-[11px] leading-relaxed text-taupe">
			<div>
				<span class="text-lamp font-medium">Focus mode:</span> chat is quiet so the room can lock in.
			</div>
			{#if room.modeRemaining > 0}
				<span class="num ml-2 whitespace-nowrap text-xs font-semibold text-lamp">
					{formatCountdown(room.modeRemaining)}
				</span>
			{/if}
		</div>
	{:else}
		<div class="mt-2.5 flex items-center justify-between rounded-field px-3 py-1.5 text-[11px] leading-relaxed" style="border: 1px solid color-mix(in srgb, var(--color-amber) 35%, transparent); background: color-mix(in srgb, var(--color-amber) 8%, transparent); color: var(--color-cream)">
			<div>
				<span class="font-medium" style="color: var(--color-amber)">Break mode:</span> floor is open! Chat & unwind.
			</div>
			{#if room.modeRemaining > 0}
				<span class="num ml-2 whitespace-nowrap text-xs font-semibold" style="color: var(--color-amber)">
					{formatCountdown(room.modeRemaining)}
				</span>
			{/if}
		</div>
	{/if}

	<ul bind:this={list} class="mt-3 max-h-[260px] flex-1 space-y-2.5 overflow-y-auto pr-1">
		{#each messages as msg (msg.id)}
			<li class="text-sm leading-relaxed">
				<p class="flex items-baseline gap-2 text-xs">
					<span class={msg.whoId === room.clientId ? 'text-lamp' : 'text-taupe'}>{msg.who}</span>
					<span class="num text-[10px] text-faint">{clock(msg.ts)}</span>
				</p>
				<p class="break-words text-cream/90">{msg.text}</p>
			</li>
		{:else}
			<li class="num text-xs leading-relaxed text-faint">quiet in here. say something.</li>
		{/each}
	</ul>

	<form class="mt-3 flex gap-2 border-t border-cream/10 pt-3" onsubmit={send}>
		<input
			type="text"
			maxlength="280"
			autocomplete="off"
			placeholder={room.mode === 'focus' ? (room.modeRemaining > 0 ? `Chat locked · opens in ${formatCountdown(room.modeRemaining)}` : 'Focus mode · chat is quiet') : 'Break mode · say something to the room...'}
			disabled={room.mode === 'focus'}
			class="min-w-0 flex-1 rounded-field border border-cream/10 bg-night/60 px-3 py-2 text-sm text-cream outline-none transition-colors placeholder:text-faint/80 focus:border-lamp/60 disabled:cursor-not-allowed disabled:opacity-50"
			bind:value={draft}
			aria-label="Chat message"
		/>
		<button
			class="btn btn-ghost btn-sm"
			type="submit"
			disabled={room.mode === 'focus' || !draft.trim()}
			aria-label="Send message"
		>
			<IconSend size={15} stroke={1.5} />
		</button>
	</form>
</div>
