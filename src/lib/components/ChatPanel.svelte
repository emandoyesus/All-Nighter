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

<div class="panel flex min-h-[220px] flex-1 flex-col p-3.5 sm:p-4">
	<div class="flex items-center justify-between gap-3">
		<div class="flex items-center gap-2">
			<h3 class="text-xs sm:text-sm font-medium">Late-night chat</h3>
			<span class="inline-flex items-center gap-1.5 rounded-full border border-lamp/40 bg-lamp/10 px-2 py-0.5 font-mono text-[10px] text-lamp font-medium shadow-[0_0_8px_color-mix(in_srgb,var(--color-lamp)_20%,transparent)]">
				<span class="h-1.5 w-1.5 rounded-full bg-lamp animate-pulse"></span>
				{room.awake.length} awake
			</span>
		</div>
		<span class="num text-[11px] text-faint">{messages.length} msgs</span>
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
	{:else if room.modeRemaining > 0}
		<div class="mt-2.5 flex items-center justify-between rounded-field px-3 py-1.5 text-[11px] leading-relaxed border border-lamp/30 bg-lamp/5 text-taupe">
			<div>
				<span class="font-medium text-lamp">Normal mode:</span> floor is open! Chat & listen together.
			</div>
			<span class="num ml-2 whitespace-nowrap text-xs font-semibold text-lamp">
				{formatCountdown(room.modeRemaining)}
			</span>
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
			placeholder={room.mode === 'focus' ? (room.modeRemaining > 0 ? `Chat locked · focus ends in ${formatCountdown(room.modeRemaining)}` : 'Focus mode · chat is quiet') : 'Say something to the room...'}
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
