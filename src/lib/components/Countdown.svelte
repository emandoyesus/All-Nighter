<script lang="ts">
	import { onMount } from 'svelte';
	import { DAWN } from '#lib/config';

	let left = $state('--:--:--');

	function nextDawn(now: Date): Date {
		const dawn = new Date(now);
		dawn.setHours(DAWN.h, DAWN.m, 0, 0);
		if (dawn.getTime() <= now.getTime()) dawn.setDate(dawn.getDate() + 1);
		return dawn;
	}

	function format(ms: number): string {
		const total = Math.max(0, Math.floor(ms / 1000));
		const h = Math.floor(total / 3600);
		const m = Math.floor((total % 3600) / 60);
		const s = total % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	onMount(() => {
		let target = nextDawn(new Date()).getTime();
		const update = () => {
			if (Date.now() >= target) target = nextDawn(new Date()).getTime();
			left = format(target - Date.now());
		};
		update();
		const id = window.setInterval(update, 1000);
		return () => window.clearInterval(id);
	});
</script>

<div class="panel p-5">
	<p class="text-sm text-taupe">till sunrise</p>
	<p class="num mt-2 text-4xl leading-none tracking-tight md:text-[2.6rem]" aria-label="time until sunrise">
		{left}
	</p>
	<p class="num mt-2.5 text-xs text-faint">dawn at {DAWN.h}:{String(DAWN.m).padStart(2, '0')} local</p>
</div>
