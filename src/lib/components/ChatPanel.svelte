<script lang="ts">
	import { onMount } from 'svelte';
	import { room } from '#lib/room/room.svelte';
	import IconSend from '@tabler/icons-svelte/icons/send-2';
	import IconNotes from '@tabler/icons-svelte/icons/notes';
	import IconMessages from '@tabler/icons-svelte/icons/messages';

	let draft = $state('');
	let list: HTMLUListElement | undefined = $state();
	let scratchNotes = $state('');
	let view = $state<'chat' | 'scratch'>('chat');

	onMount(() => {
		try {
			scratchNotes = localStorage.getItem('an.scratch') || '';
		} catch {}
	});

	function saveScratch(val: string): void {
		scratchNotes = val;
		try {
			localStorage.setItem('an.scratch', val);
		} catch {}
	}

	const messages = $derived(room.state.chat ?? []);

	$effect(() => {
		if (messages.length && list) {
			queueMicrotask(() => {
				if (list) list.scrollTop = list.scrollHeight;
			});
		}
	});

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

<div class="panel flex min-h-[220px] flex-1 flex-col p-3.5 sm:p-4 {room.mode === 'focus' ? 'border-amber-400/25 bg-night/85' : ''}">
	<div class="flex items-center justify-between gap-3">
		<div class="flex items-center gap-2">
			<h3 class="text-xs sm:text-sm font-medium">Late-night chat</h3>
			<span class="inline-flex items-center gap-1.5 rounded-full border border-lamp/40 bg-lamp/10 px-2 py-0.5 font-mono text-[10px] text-lamp font-medium">
				<span class="h-1.5 w-1.5 rounded-full bg-lamp animate-pulse"></span>
				{room.awake.length} awake
			</span>
		</div>
		<div class="flex items-center gap-2">
			{#if room.mode === 'focus'}
				<button
					type="button"
					class="text-[10px] font-mono px-2 py-0.5 rounded border transition-colors flex items-center gap-1 {view === 'scratch' ? 'border-amber-400/50 bg-amber-400/20 text-amber-200' : 'border-amber-400/20 text-amber-300 hover:bg-amber-400/10'}"
					onclick={() => (view = view === 'scratch' ? 'chat' : 'scratch')}
					title={view === 'scratch' ? 'Switch back to chat history' : 'Open private sprint scratchpad'}
				>
					<IconNotes size={11} stroke={1.5} />
					<span>{view === 'scratch' ? 'Chat' : 'Scratchpad'}</span>
				</button>
			{/if}
			<span class="num text-[11px] text-faint">{messages.length} msgs</span>
		</div>
	</div>

	<!-- Mode status indicator -->
	{#if room.mode === 'focus'}
		<div class="mt-2.5 flex items-center justify-between rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-1.5 text-[11px] leading-relaxed text-amber-200">
			<div class="flex items-center gap-2">
				<span class="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
				<span><strong class="text-amber-300 font-mono">Focus Sprint:</strong> Chat muted for flow</span>
			</div>
			{#if room.modeRemaining > 0}
				<span class="num ml-2 whitespace-nowrap text-xs font-bold text-amber-300 font-mono">
					{formatCountdown(room.modeRemaining)} left
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

	{#if view === 'scratch' && room.mode === 'focus'}
		<div class="mt-3 flex-1 flex flex-col">
			<p class="text-[10px] font-mono text-faint mb-1.5">
				Personal Sprint Scratchpad (Saved to browser)
			</p>
			<textarea
				class="w-full flex-1 min-h-[160px] rounded-lg border border-amber-400/25 bg-night/90 p-2.5 text-xs text-cream font-mono outline-none focus:border-amber-400/60 resize-none transition-colors placeholder:text-faint/50"
				placeholder="Jot down sprint tasks, thoughts, or lines of code here during your 50-minute focus block..."
				value={scratchNotes}
				oninput={(e) => saveScratch(e.currentTarget.value)}
			></textarea>
		</div>
	{:else}
		<ul bind:this={list} class="mt-3 max-h-[300px] flex-1 space-y-3 overflow-y-auto pr-1 scroll-smooth">
			{#each messages as msg (msg.id)}
				{@const isSelf = msg.whoId === room.clientId}
				{#if isSelf}
					<!-- Self Chatbox (Right-aligned) -->
					<li class="flex flex-col items-end gap-1">
						<div class="max-w-[85%] rounded-2xl rounded-tr-xs border border-lamp/30 bg-lamp/15 px-3.5 py-2 text-cream shadow-sm">
							<p class="break-words text-xs leading-relaxed selection:bg-lamp/30">{msg.text}</p>
						</div>
						<div class="flex items-center gap-1.5 px-1 text-[10px] font-mono text-faint">
							<span>{clock(msg.ts)}</span>
							<span class="text-lamp font-medium">· you</span>
						</div>
					</li>
				{:else}
					<!-- Peer Chatbox (Left-aligned) -->
					<li class="flex items-start gap-2 max-w-[90%]">
						<!-- Peer Avatar or Initial -->
						<button
							type="button"
							class="shrink-0 rounded-full border border-cream/15 hover:border-cream/40 transition-colors cursor-pointer mt-0.5 overflow-hidden"
							onclick={() => window.dispatchEvent(new CustomEvent('an:inspect-peer', { detail: { name: msg.who, id: msg.whoId } }))}
							title="Inspect {msg.who}'s profile"
						>
							{#if msg.avatar && (msg.avatar.startsWith('http') || msg.avatar.startsWith('/'))}
								<img src={msg.avatar} alt={msg.who} class="h-6 w-6 rounded-full object-cover" />
							{:else}
								<div class="h-6 w-6 rounded-full bg-cream/10 text-[10px] font-mono font-bold text-taupe grid place-items-center">
									{msg.who.slice(0, 1).toUpperCase()}
								</div>
							{/if}
						</button>

						<!-- Peer Chatbox Bubble -->
						<div class="flex flex-col items-start gap-1 min-w-0">
							<div class="rounded-2xl rounded-tl-xs border border-cream/15 bg-[#0b1214] px-3.5 py-2 shadow-sm text-cream/90">
								<div class="flex items-baseline gap-2 mb-1">
									<button
										type="button"
										class="font-medium text-[11px] text-lamp hover:underline cursor-pointer truncate max-w-[140px]"
										onclick={() => window.dispatchEvent(new CustomEvent('an:inspect-peer', { detail: { name: msg.who, id: msg.whoId } }))}
									>
										{msg.who}
									</button>
									<span class="text-[10px] text-faint font-mono">{clock(msg.ts)}</span>
								</div>
								<p class="break-words text-xs leading-relaxed text-cream/90">{msg.text}</p>
							</div>
						</div>
					</li>
				{/if}
			{:else}
				<li class="flex flex-col items-center justify-center py-7 text-center">
					<span class="grid h-8 w-8 place-items-center rounded-xl border border-cream/10 bg-cream/5 text-taupe mb-2">
						<IconMessages size={16} stroke={1.5} />
					</span>
					<p class="text-xs font-mono text-taupe">Quiet night floor</p>
					<p class="text-[11px] text-faint mt-0.5">Send a message to break the silence.</p>
				</li>
			{/each}
		</ul>
	{/if}

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
			class="btn btn-sm px-3 flex items-center justify-center transition-all {draft.trim() && room.mode !== 'focus' ? 'bg-lamp text-night hover:bg-lamp/90 font-medium' : 'btn-ghost text-faint disabled:opacity-40'}"
			type="submit"
			disabled={room.mode === 'focus' || !draft.trim()}
			aria-label="Send message"
		>
			<IconSend size={15} stroke={1.8} />
		</button>
	</form>
</div>
