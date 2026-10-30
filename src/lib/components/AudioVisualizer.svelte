<script lang="ts">
	interface Props {
		bars?: number;
		active?: boolean;
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	}

	let { bars = 5, active = true, size = 'md', class: className = '' }: Props = $props();

	const heights = [
		'h-1.5',
		'h-3',
		'h-5',
		'h-3.5',
		'h-2',
		'h-4',
		'h-2.5',
		'h-4.5',
		'h-3',
		'h-1.5',
		'h-4',
		'h-2'
	];
</script>

<div
	class="inline-flex items-end gap-[2.5px] select-none {size === 'sm'
		? 'h-3.5'
		: size === 'lg'
			? 'h-6'
			: 'h-4.5'} {className}"
	aria-hidden="true"
>
	{#each Array(bars) as _, i}
		<span
			class="w-[2.5px] rounded-full bg-lamp transition-all duration-300 {active
				? 'eq-bar'
				: 'h-[3px] opacity-30'}"
			style={active
				? `animation-delay: ${(i * 0.12) % 0.6}s; animation-duration: ${0.7 + ((i * 0.15) % 0.5)}s;`
				: ''}
		></span>
	{/each}
</div>

<style>
	@keyframes eq-pulse {
		0%,
		100% {
			height: 3px;
			opacity: 0.4;
		}
		50% {
			height: 100%;
			opacity: 1;
		}
	}

	.eq-bar {
		animation: eq-pulse infinite ease-in-out;
	}
</style>
