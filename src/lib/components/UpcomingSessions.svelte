<script lang="ts">
	import { onMount } from 'svelte';
	import { upcoming, type UpcomingSession } from '#lib/data/archive';
	import { TELEGRAM_URL } from '#lib/config';
	import { reveal } from '#lib/reveal';
	import IconCalendar from '@tabler/icons-svelte/icons/calendar-event';
	import IconBell from '@tabler/icons-svelte/icons/bell';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconDownload from '@tabler/icons-svelte/icons/download';
	import IconBrandGoogle from '@tabler/icons-svelte/icons/brand-google';
	import IconCalendarPlus from '@tabler/icons-svelte/icons/calendar-plus';
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

	function formatCalDate(d: Date): string {
		return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
	}

	function sessionRoomUrl(slug: string): string {
		if (typeof location === 'undefined') return '';
		return `${location.origin}/room?room=${slug}`;
	}

	function googleCalUrl(session: UpcomingSession): string {
		const start = new Date(session.iso);
		const end = new Date(start.getTime() + 6 * 3600 * 1000); // 6 hour all nighter
		const url = sessionRoomUrl(session.slug);
		const details = `${session.blurb}\n\nJoin the live room here: ${url}`;

		const params = new URLSearchParams({
			action: 'TEMPLATE',
			text: `All Nighter: ${session.title}`,
			dates: `${formatCalDate(start)}/${formatCalDate(end)}`,
			details,
			location: url
		});
		return `https://calendar.google.com/calendar/render?${params.toString()}`;
	}

	function downloadIcs(session: UpcomingSession): void {
		const start = new Date(session.iso);
		const end = new Date(start.getTime() + 6 * 3600 * 1000);
		const url = sessionRoomUrl(session.slug);
		const dtStart = formatCalDate(start);
		const dtEnd = formatCalDate(end);
		const dtStamp = formatCalDate(new Date());

		const icsContent = [
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//All Nighter//Upcoming Session//EN',
			'CALSCALE:GREGORIAN',
			'METHOD:PUBLISH',
			'BEGIN:VEVENT',
			`UID:${session.slug}-${start.getTime()}@allnighter`,
			`DTSTAMP:${dtStamp}`,
			`DTSTART:${dtStart}`,
			`DTEND:${dtEnd}`,
			`SUMMARY:All Nighter: ${session.title}`,
			`DESCRIPTION:${session.blurb}\\n\\nRoom: ${url}`,
			`LOCATION:${url}`,
			'STATUS:CONFIRMED',
			'BEGIN:VALARM',
			'TRIGGER:-PT15M',
			'ACTION:DISPLAY',
			`DESCRIPTION:Reminder: All Nighter starts in 15 minutes!`,
			'END:VALARM',
			'END:VEVENT',
			'END:VCALENDAR'
		].join('\r\n');

		const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
		const blobUrl = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = blobUrl;
		a.download = `${session.slug}.ics`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(blobUrl);
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
				Themed nights, scheduled in advance. Add directly to your calendar to receive real desktop & mobile reminders before the first track.
			</p>
		</div>
		<a href={TELEGRAM_URL} target="_blank" rel="noreferrer" class="btn btn-ghost btn-sm">
			<IconBrandTelegram size={15} stroke={1.5} />
			Telegram crew group
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
					<a
						href={googleCalUrl(session)}
						target="_blank"
						rel="noreferrer"
						class="btn btn-primary btn-sm inline-flex items-center gap-1.5"
						title="Add to Google Calendar with 15m notification"
					>
						<IconBrandGoogle size={14} stroke={1.5} />
						<IconCalendarPlus size={14} stroke={1.5} />
						<span>Google Cal</span>
					</a>

					<button
						type="button"
						class="btn btn-ghost btn-sm"
						onclick={() => downloadIcs(session)}
						title="Download .ics file for Apple Calendar, Outlook, and mobile"
					>
						<IconDownload size={14} stroke={1.5} />
						.ICS File
					</button>

					<button
						class={rsvps[session.slug] ? 'btn btn-ghost btn-sm border-lamp/40 text-lamp' : 'btn btn-ghost btn-sm'}
						onclick={() => toggleRsvp(session.slug)}
						aria-pressed={!!rsvps[session.slug]}
					>
						{#if rsvps[session.slug]}
							<IconCheck size={14} stroke={1.5} />
							RSVP'd
						{:else}
							<IconBell size={14} stroke={1.5} />
							Bookmark
						{/if}
					</button>

					<a href="/room?room={session.slug}" class="btn btn-ghost btn-sm ml-auto">
						Open room
					</a>
				</div>
			</article>
		{/each}
	</div>
</section>
