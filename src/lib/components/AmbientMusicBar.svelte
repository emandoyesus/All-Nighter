<script lang="ts">
	import { ambientMusic, PRESETS, type MusicPreset } from '#lib/audio/ambient-music.svelte';
	import { magnetic } from '#lib/magnetic';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconPlayerPlay from '@tabler/icons-svelte/icons/player-play';
	import IconPlayerPause from '@tabler/icons-svelte/icons/player-pause';
	import IconVolume from '@tabler/icons-svelte/icons/volume';
	import IconVolumeOff from '@tabler/icons-svelte/icons/volume-off';
	import IconChevronUp from '@tabler/icons-svelte/icons/chevron-up';
	import IconChevronDown from '@tabler/icons-svelte/icons/chevron-down';
	import IconSparkles from '@tabler/icons-svelte/icons/sparkles';

	let expanded = $state(false);

	const activePresetInfo = $derived(PRESETS[ambientMusic.preset]);
</script>

<!-- Ambient Music Floating Dock -->
<div class="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 text-cream pointer-events-none select-none">
	<!-- Expanded Settings Card -->
	{#if expanded}
		<div
			class="pointer-events-auto w-[290px] sm:w-[320px] rounded-2xl border border-lamp/25 bg-night-2/95 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all duration-200"
			role="region"
			aria-label="Ambient soundscape settings"
		>
			<div class="flex items-center justify-between pb-3 border-b border-cream/10">
				<div class="flex items-center gap-2">
					<IconSparkles size={15} stroke={2} class="text-lamp" />
					<span class="text-xs font-semibold uppercase tracking-wider text-cream">Nocturnal Soundscapes</span>
				</div>
				<button
					class="text-faint hover:text-cream transition-colors p-1"
					onclick={() => (expanded = false)}
					title="Close soundscape settings"
					aria-label="Close soundscape settings"
				>
					<IconChevronDown size={16} stroke={2} />
				</button>
			</div>

			<!-- Preset Selection -->
			<div class="mt-3 flex flex-col gap-1.5">
				{#each Object.values(PRESETS) as p}
					<button
						class="flex flex-col text-left rounded-xl p-2.5 transition-colors border {ambientMusic.preset === p.id
							? 'border-lamp/40 bg-lamp/12 text-cream'
							: 'border-cream/5 bg-night-3/60 text-taupe hover:border-cream/15 hover:text-cream'}"
						onclick={() => {
							ambientMusic.setPreset(p.id);
							if (!ambientMusic.isPlaying) ambientMusic.play();
						}}
					>
						<div class="flex items-center justify-between">
							<span class="text-xs font-medium {ambientMusic.preset === p.id ? 'text-lamp' : 'text-cream'}">{p.name}</span>
							{#if ambientMusic.preset === p.id && ambientMusic.isPlaying}
								<span class="inline-flex items-center gap-1 text-[10px] font-mono text-lamp uppercase tracking-wider">
									<span class="soft-blink h-1.5 w-1.5 rounded-full bg-lamp"></span>
									{ambientMusic.currentChord}
								</span>
							{/if}
						</div>
						<span class="text-[11px] text-faint mt-0.5 leading-snug">{p.tagline}</span>
					</button>
				{/each}
			</div>

			<!-- Volume Slider & Status -->
			<div class="mt-3.5 pt-3 border-t border-cream/10 flex items-center gap-3">
				<button
					class="text-faint hover:text-cream transition-colors"
					onclick={() => ambientMusic.setVolume(ambientMusic.volume === 0 ? 45 : 0)}
					title={ambientMusic.volume === 0 ? 'Unmute' : 'Mute'}
					aria-label={ambientMusic.volume === 0 ? 'Unmute' : 'Mute'}
				>
					{#if ambientMusic.volume === 0}
						<IconVolumeOff size={16} stroke={1.5} />
					{:else}
						<IconVolume size={16} stroke={1.5} class="text-lamp" />
					{/if}
				</button>
				<input
					type="range"
					min="0"
					max="100"
					class="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-cream/15 accent-[#8ec765]"
					value={ambientMusic.volume}
					oninput={(e) => ambientMusic.setVolume(Number((e.target as HTMLInputElement).value))}
					aria-label="Ambient music volume"
				/>
				<span class="num w-7 text-right font-mono text-[11px] text-faint">
					{ambientMusic.volume}%
				</span>
			</div>
		</div>
	{/if}

	<!-- Collapsed Floating Pill -->
	<div
		class="pointer-events-auto flex items-center gap-1.5 rounded-full border border-lamp/25 bg-night-2/90 px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-200 hover:border-lamp/50"
		role="region"
		aria-label="Soft ambient music player"
	>
		<!-- Play / Pause Button -->
		<button
			class="flex h-7 w-7 items-center justify-center rounded-full transition-transform active:scale-95 {ambientMusic.isPlaying
				? 'bg-lamp text-night'
				: 'bg-cream/10 text-cream hover:bg-cream/20'}"
			onclick={() => ambientMusic.toggle()}
			title={ambientMusic.isPlaying ? 'Pause ambient music' : 'Play soft ambient music'}
			aria-label={ambientMusic.isPlaying ? 'Pause ambient music' : 'Play soft ambient music'}
		>
			{#if ambientMusic.isPlaying}
				<IconPlayerPause size={13} stroke={2.5} />
			{:else}
				<IconPlayerPlay size={13} stroke={2.5} class="ml-0.5" />
			{/if}
		</button>

		<!-- Music Identity & Equalizer -->
		<button
			class="flex items-center gap-2 px-1 text-left"
			onclick={() => (expanded = !expanded)}
			title="Customize soundscape"
			aria-label="Customize soundscape"
		>
			<!-- Animated Soundwave equalizer bars -->
			<div class="flex items-end gap-0.5 h-3.5 w-3" aria-hidden="true">
				<span
					class="w-0.5 rounded-full bg-lamp transition-all duration-300 {ambientMusic.isPlaying
						? 'h-3.5 animate-pulse'
						: 'h-1 opacity-40'}"
				></span>
				<span
					class="w-0.5 rounded-full bg-lamp transition-all duration-300 {ambientMusic.isPlaying
						? 'h-2 animate-bounce'
						: 'h-1 opacity-40'}"
				></span>
				<span
					class="w-0.5 rounded-full bg-lamp transition-all duration-300 {ambientMusic.isPlaying
						? 'h-3 animate-pulse delay-100'
						: 'h-1 opacity-40'}"
				></span>
			</div>

			<div class="flex flex-col">
				<div class="flex items-center gap-1.5">
					<span class="text-xs font-medium text-cream">{activePresetInfo.name}</span>
					{#if ambientMusic.isPlaying}
						<span class="num text-[10px] font-mono text-lamp/80 uppercase">({ambientMusic.currentChord})</span>
					{/if}
				</div>
				<span class="text-[9px] font-mono uppercase tracking-wider text-faint">
					{ambientMusic.isPlaying ? 'Ambient on air' : 'Soft ambient music'}
				</span>
			</div>

			<div class="ml-1 text-faint hover:text-cream transition-colors">
				{#if expanded}
					<IconChevronDown size={14} stroke={2} />
				{:else}
					<IconChevronUp size={14} stroke={2} />
				{/if}
			</div>
		</button>
	</div>
</div>
