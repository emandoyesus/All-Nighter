<script lang="ts">
	import { onMount } from 'svelte';
	import { nights, type Night } from '#lib/data/archive';
	import { loadMyNights } from '#lib/data/local-logbook';
	import { splitReveal } from '#lib/split-reveal';
	import { tilt } from '#lib/tilt';
	import IconChevronRight from '@tabler/icons-svelte/icons/chevron-right';
	import IconClock from '@tabler/icons-svelte/icons/clock';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconUsers from '@tabler/icons-svelte/icons/users';
	import IconSparkles from '@tabler/icons-svelte/icons/sparkles';
	import IconBroadcast from '@tabler/icons-svelte/icons/broadcast';

	let myNights = $state<Night[]>([]);

	onMount(() => {
		myNights = loadMyNights();
	});

	const allNights = $derived.by(() => {
		const combined = [...nights];
		for (const mn of myNights) {
			if (!combined.some((n) => n.slug === mn.slug)) {
				combined.push(mn);
			}
		}
		return combined.sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime());
	});
</script>

<section id="archive" class="relative border-t border-cream/10 bg-[#060a0b] py-16 md:py-24 overflow-hidden">
	<!-- Subtle dot ledger pattern -->
	<div class="pointer-events-none absolute inset-0 opacity-25" style="background-image: radial-gradient(rgba(131, 249, 214, 0.15) 1px, transparent 1px); background-size: 24px 24px;"></div>
	<!-- Ambient top gradient divider line -->
	<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lamp/40 to-transparent"></div>

	<div class="relative mx-auto max-w-[1400px] px-5">
		<p class="eyebrow">{allNights.length} {allNights.length === 1 ? 'night' : 'nights'} on record</p>
		<h2 class="mt-4 text-3xl font-semibold tracking-tight md:text-4xl" data-split use:splitReveal>
			The archive
		</h2>
		<p class="mt-3 max-w-[52ch] text-sm leading-relaxed text-taupe">
			Every session gets a page. The tracklist, who was there, what everyone was working on, and the
			line that the room decided to screenshot.
		</p>

		{#if allNights.length === 1}
			{@const night = allNights[0]}
			<!-- Balanced showcase for single featured night -->
			<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
				<!-- Left Column: Featured Archive Card -->
				<div class="lg:col-span-7">
					<a
						href="/archive/{night.slug}"
						class="group relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-cream/10 bg-night-2 p-6 transition-all duration-300 hover:border-lamp/50"
						use:tilt={3}
					>
						<!-- Notebook binding spine accent -->
						<div class="absolute left-0 top-0 bottom-0 w-1 bg-cyber-teal group-hover:w-1.5 transition-all"></div>

						<!-- Watermark Serial Index Number -->
						<span class="pointer-events-none absolute right-5 top-3 font-mono text-5xl font-extrabold text-cream/[0.04] select-none group-hover:text-lamp/[0.08] transition-colors">
							01
						</span>

						<div>
							<!-- Top Bar -->
							<div class="flex items-center justify-between gap-2 border-b border-cream/10 pb-3 pl-1">
								<div class="flex items-center gap-2">
									<span class="inline-flex items-center gap-1.5 rounded bg-lamp/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-lamp border border-lamp/30">
										<span class="h-1 w-1 rounded-full bg-lamp"></span>
										{night.tag}
									</span>
									<span class="font-mono text-[10px] uppercase tracking-wider text-faint">
										FEATURED LOG #001
									</span>
								</div>
								<span class="font-mono text-xs text-taupe">{night.date}</span>
							</div>

							<!-- Title & Note -->
							<div class="pt-4 pl-1">
								<h3 class="text-2xl font-semibold tracking-tight text-cream group-hover:text-lamp transition-colors leading-snug">
									{night.title}
								</h3>
								<p class="mt-2.5 text-sm leading-relaxed text-taupe">
									{night.note}
								</p>
							</div>

							<!-- Chat Moment Quote Box -->
							{#if night.chatMoments && night.chatMoments[0]}
								<div class="mt-5 rounded-lg border border-cream/8 bg-night-3/70 p-3.5 pl-4">
									<div class="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-faint mb-1.5">
										<span class="text-lamp/80 flex items-center gap-1">
											<span>REC</span>
											<span>//</span>
											<span>{night.chatMoments[0].at}</span>
										</span>
										<span>@{night.chatMoments[0].who}</span>
									</div>
									<p class="font-mono text-xs leading-relaxed text-cream/90 italic">
										"{night.chatMoments[0].text}"
									</p>
								</div>
							{/if}
						</div>

						<!-- Bottom Ledger Metrics Strip -->
						<div class="mt-6 border-t border-cream/8 pt-4 pl-1 flex items-center justify-between gap-3 font-mono text-xs text-faint">
							<div class="flex items-center gap-4">
								<span class="inline-flex items-center gap-1.5">
									<IconClock size={13} stroke={1.5} class="text-amber" />
									<span class="text-cream/80">{night.hours}</span>
								</span>
								<span class="inline-flex items-center gap-1.5">
									<IconMusic size={13} stroke={1.5} class="text-lamp" />
									<span class="text-cream/80">{night.tracks} tracks</span>
								</span>
								<span class="inline-flex items-center gap-1.5">
									<IconUsers size={13} stroke={1.5} class="text-amber-200/80" />
									<span class="text-cream/80">{night.heads} heads</span>
								</span>
							</div>

							<span class="inline-flex items-center gap-1 text-taupe font-sans text-xs group-hover:text-lamp transition-colors shrink-0">
								<span>Read logbook</span>
								<IconChevronRight size={13} stroke={1.5} class="transition-transform group-hover:translate-x-0.5" />
							</span>
						</div>
					</a>
				</div>

				<!-- Right Column: Companion Next Session Card -->
				<div class="lg:col-span-5 flex flex-col justify-between rounded-xl border border-dashed border-cream/15 bg-night-2/50 p-6">
					<div>
						<div class="flex items-center justify-between border-b border-cream/10 pb-3">
							<span class="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-faint">
								<IconSparkles size={13} class="text-amber" />
								<span>Personal Logbook</span>
							</span>
							<span class="inline-flex items-center gap-1 rounded bg-lamp/10 px-2 py-0.5 font-mono text-[10px] text-lamp">
								<span class="h-1 w-1 rounded-full bg-lamp animate-pulse"></span>
								Active ledger
							</span>
						</div>

						<h3 class="mt-4 text-xl font-semibold tracking-tight text-cream">
							Log your next lock-in
						</h3>
						<p class="mt-2 text-xs leading-relaxed text-taupe">
							Every time you stay awake in the room until the dawn ritual (06:00), your setlist, attendees, chat highlights, and focus minutes automatically archive into your private logbook.
						</p>

						<div class="mt-5 space-y-2.5 rounded-lg border border-cream/8 bg-night-3/40 p-3 text-xs">
							<div class="flex items-center justify-between font-mono text-[11px]">
								<span class="text-faint">Dawn ritual snapshot</span>
								<span class="text-cream font-medium">Automatic</span>
							</div>
							<div class="flex items-center justify-between font-mono text-[11px]">
								<span class="text-faint">Local storage backup</span>
								<span class="text-lamp font-medium">Persisted</span>
							</div>
							<div class="flex items-center justify-between font-mono text-[11px]">
								<span class="text-faint">Export tracklist</span>
								<span class="text-cream font-medium">CSV & YouTube</span>
							</div>
						</div>
					</div>

					<div class="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-cream/8">
						<a href="/room" class="btn btn-primary btn-sm inline-flex items-center gap-1.5">
							<IconBroadcast size={14} />
							<span>Enter live room</span>
						</a>
						<a href="/archive" class="btn btn-ghost btn-sm inline-flex items-center gap-1">
							<span>All logs</span>
							<IconChevronRight size={13} stroke={1.5} />
						</a>
					</div>
				</div>
			</div>
		{:else}
			<!-- Multi-night rail when multiple archives exist -->
			<div class="rail mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5">
				{#each allNights as night, i (night.seed)}
					<a
						href="/archive/{night.slug}"
						class="group relative flex w-[85vw] max-w-[420px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-xl border border-cream/10 bg-night-2 p-6 transition-all duration-300 hover:border-lamp/50 sm:w-[60vw] lg:w-[390px]"
						use:tilt={3}
					>
						<!-- Notebook binding spine accent -->
						<div class="absolute left-0 top-0 bottom-0 w-1 bg-cyber-teal group-hover:w-1.5 transition-all"></div>

						<!-- Watermark Serial Index Number -->
						<span class="pointer-events-none absolute right-5 top-3 font-mono text-5xl font-extrabold text-cream/[0.04] select-none group-hover:text-lamp/[0.08] transition-colors">
							{String(i + 1).padStart(2, '0')}
						</span>

						<div>
							<!-- Top Bar -->
							<div class="flex items-center justify-between gap-2 border-b border-cream/10 pb-3 pl-1">
								<div class="flex items-center gap-2">
									<span class="inline-flex items-center gap-1.5 rounded bg-lamp/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-lamp border border-lamp/30">
										<span class="h-1 w-1 rounded-full bg-lamp"></span>
										{night.tag}
									</span>
									<span class="font-mono text-[10px] uppercase tracking-wider text-faint">
										LOG #{String(i + 1).padStart(3, '0')}
									</span>
								</div>
								<span class="font-mono text-xs text-taupe">{night.date}</span>
							</div>

							<!-- Title & Note -->
							<div class="pt-3.5 pl-1">
								<h3 class="text-xl font-semibold tracking-tight text-cream group-hover:text-lamp transition-colors leading-snug">
									{night.title}
								</h3>
								<p class="mt-2 text-xs leading-relaxed text-taupe line-clamp-3">
									{night.note}
								</p>
							</div>

							<!-- Chat Moment Quote Box -->
							{#if night.chatMoments && night.chatMoments[0]}
								<div class="mt-4 rounded-lg border border-cream/8 bg-night-3/70 p-3 pl-3.5">
									<div class="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-faint mb-1.5">
										<span class="text-lamp/80 flex items-center gap-1">
											<span>REC</span>
											<span>//</span>
											<span>{night.chatMoments[0].at}</span>
										</span>
										<span>@{night.chatMoments[0].who}</span>
									</div>
									<p class="font-mono text-[11px] leading-relaxed text-cream/90 italic">
										"{night.chatMoments[0].text}"
									</p>
								</div>
							{/if}
						</div>

						<!-- Bottom Ledger Metrics Strip -->
						<div class="mt-6 border-t border-cream/8 pt-4 pl-1 flex items-center justify-between gap-3 font-mono text-xs text-faint">
							<div class="flex items-center gap-3">
								<span class="inline-flex items-center gap-1">
									<IconClock size={12} stroke={1.5} class="text-amber" />
									<span class="text-cream/80">{night.hours}</span>
								</span>
								<span class="inline-flex items-center gap-1">
									<IconMusic size={12} stroke={1.5} class="text-lamp" />
									<span class="text-cream/80">{night.tracks} tracks</span>
								</span>
								<span class="inline-flex items-center gap-1">
									<IconUsers size={12} stroke={1.5} class="text-amber-200/80" />
									<span class="text-cream/80">{night.heads}</span>
								</span>
							</div>

							<span class="inline-flex items-center gap-1 text-taupe font-sans text-xs group-hover:text-lamp transition-colors shrink-0">
								<span>Read</span>
								<IconChevronRight size={13} stroke={1.5} class="transition-transform group-hover:translate-x-0.5" />
							</span>
						</div>
					</a>
				{/each}
			</div>

			<a href="/archive" class="btn btn-ghost btn-sm mt-2">
				All nights
				<IconChevronRight size={14} stroke={1.5} />
			</a>
		{/if}
	</div>
</section>
