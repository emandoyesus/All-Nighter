<script lang="ts">
	import { onMount } from 'svelte';
	import { upcoming } from '#lib/data/archive';
	import { TELEGRAM_URL } from '#lib/config';
	import { reveal } from '#lib/reveal';
	import IconCalendar from '@tabler/icons-svelte/icons/calendar-event';
	import IconBell from '@tabler/icons-svelte/icons/bell';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconBrandTelegram from '@tabler/icons-svelte/icons/brand-telegram';

	let now = $state(0);
	let rsvps = $state<Record<string, boolean>>({});

	const LS_PREFIX = 'an.rsvp.';

	onMount(() => {
		now = Date.now();
		const stored: Record<string, boolean> = {};
		for (const session of upcoming) {
			try {
				if (localStorage.getItem(LS_PREFIX + session.slug) === '1') stored[session.slug] = true;
			} catch {
				/* ignore */
			}
		}
		rsvps = stored;
		const id = window.setInterval(() => (now = Date.now()), 1000);
		return () => window.clearInterval(id);
	});

	function countdown(iso: string): string {
		if (!now) return '--:--:--';
		const diff = new Date(iso).getTime() - now;
		if (diff <= 0) return 'starting now';
		const total = Math.floor(diff / 1000);
		const days = Math.floor(total / 86400);
		const h = Math.floor((total % 86400) / 3600);
		const m = Math.floor((total % 3600) / 60);
		const s = total % 60;
		if (days > 0) return `${days}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	function toggleRsvp(slug: string): void {
		const next = !rsvps[slug];
		rsvps = { ...rsvps, [slug]: next };
		try {
			if (next) localStorage.setItem(LS_PREFIX + slug, '1');
			else localStorage.removeItem(LS_PREFIX + slug);
		} catch {
			/* ignore */
		}
	}
</script>

<section class="mx-auto max-w-[1400px] px-5 pt-10">
	<div class="flex flex-wrap items-end justify-between gap-3" data-reveal use:reveal>
		<div>
			<h2 class="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
				<IconCalendar size={22} stroke={1.5} class="text-lamp" />
				Next up
			</h2>
			<p class="mt-1.5 max-w-[58ch] text-sm leading-relaxed text-taupe">
				Themed nights, scheduled in advance. RSVP here and the Telegram bot will nudge you before the
				first track.
			</p>
		</div>
		<a href={TELEGRAM_URL} target="_blank" rel="noreferrer" class="btn btn-ghost btn-sm">
			<IconBrandTelegram size={15} stroke={1.5} />
			Reminders on Telegram
		</a>
	</div>

	<div class="mt-5 grid gap-4 md:grid-cols-2">
		{#each upcoming as session, i (session.slug)}
			<article class="panel flex flex-col p-5" data-reveal use:reveal={i * 60}>
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<span class="num rounded-full border border-lamp/30 bg-lamp/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-lamp">
							{session.theme} night
						</span>
						<h3 class="mt-2.5 text-lg font-medium leading-snug">{session.title}</h3>
						<p class="num mt-1 text-xs text-faint">{session.date}</p>
					</div>
					<div class="text-right">
						<p class="num text-[10px] uppercase tracking-[0.14em] text-faint">starts in</p>
						<p class="num mt-1 whitespace-nowrap text-sm text-lamp">{countdown(session.iso)}</p>
					</div>
				</div>

				<p class="mt-3 text-sm leading-relaxed text-taupe">{session.blurb}</p>

				<div class="mt-4 flex flex-wrap items-center gap-2">
					<button
						class={rsvps[session.slug] ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
						onclick={() => toggleRsvp(session.slug)}
						aria-pressed={!!rsvps[session.slug]}
					>
						{#if rsvps[session.slug]}
							<IconCheck size={14} stroke={1.5} />
							You're in
						{:else}
							<IconBell size={14} stroke={1.5} />
							RSVP
						{/if}
					</button>
					<a href="/room?room={session.slug}" class="btn btn-ghost btn-sm">
						Open the room
					</a>
					<span class="num ml-auto text-[11px] text-faint">
						{rsvps[session.slug] ? 'reminder set locally' : 'no reminder yet'}
					</span>
				</div>
			</article>
		{/each}
	</div>
</section>
