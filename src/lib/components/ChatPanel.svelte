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
</script>

<div class="panel flex min-h-[280px] flex-1 flex-col p-5">
	<div class="flex items-center justify-between gap-3">
		<h3 class="text-sm font-medium">Late-night chat</h3>
		<span class="num text-xs text-faint">{messages.length}</span>
	</div>

	<!-- Mode status indicator -->
	{#if room.mode === 'focus'}
		<div class="mt-2.5 rounded-field border border-lamp/30 bg-lamp/5 px-3 py-1.5 text-[11px] leading-relaxed text-taupe">
			<span class="text-lamp font-medium">Focus mode:</span> chat is quiet so the room can lock in. Drop intentions in the roster.
		</div>
	{:else}
		<div class="mt-2.5 rounded-field px-3 py-1.5 text-[11px] leading-relaxed" style="border: 1px solid color-mix(in srgb, var(--color-amber) 35%, transparent); background: color-mix(in srgb, var(--color-amber) 8%, transparent); color: var(--color-cream)">
			<span class="font-medium" style="color: var(--color-amber)">Break mode:</span> floor is open! Chat, talk about tracks, and unwind.
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
			placeholder="Say something to the room..."
			class="min-w-0 flex-1 rounded-field border border-cream/10 bg-night/60 px-3 py-2 text-sm text-cream outline-none transition-colors placeholder:text-faint/80 focus:border-lamp/60"
			bind:value={draft}
			aria-label="Chat message"
		/>
		<button class="btn btn-ghost btn-sm" type="submit" disabled={!draft.trim()} aria-label="Send message">
			<IconSend size={15} stroke={1.5} />
		</button>
	</form>
</div>
