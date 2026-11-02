<script lang="ts">
	import { onMount } from 'svelte';

	let root: HTMLDivElement | undefined = $state();
	let farCanvas: HTMLCanvasElement | undefined = $state();
	let midCanvas: HTMLCanvasElement | undefined = $state();
	let nearCanvas: HTMLCanvasElement | undefined = $state();

	interface WindowData {
		x: number;
		y: number;
		w: number;
		h: number;
		threshold: number;
		color: string;
	}

	interface AntennaData {
		x: number;
		topY: number;
		bottomY: number;
	}

	interface BuildingData {
		rects: { x: number; y: number; w: number; h: number }[];
		rims: { x: number; y: number; w: number }[];
		antenna?: AntennaData;
		windows: WindowData[];
	}

	interface LayerModel {
		el?: HTMLCanvasElement;
		seed: number;
		minH: number;
		maxH: number;
		body: string;
		rim: boolean;
		antennaChance: number;
		stepChance: number;
		winW: number;
		winH: number;
		gapX: number;
		gapY: number;
		d: number;
		m: number;
		buildings: BuildingData[];
	}

	const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
	const rng = (seed: number) => {
		let s = seed;
		return () => (s = (s * 16807) % 2147483647) / 2147483647;
	};

	onMount(() => {
		if (!root || !farCanvas || !midCanvas || !nearCanvas) return;

		const css = getComputedStyle(document.documentElement);
		const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
		const amber = token('--color-amber-2', '#ffc970');
		const warmAmber = token('--color-amber', '#ffb84d');
		const lamp = token('--color-lamp-2', '#9fd776');
		const coolCyan = token('--color-cyan-2', '#67e8f9');
		const rimColor = token('--color-lamp', '#8ec765');
		const rubyBeacon = '#ff334b';

		const layers: LayerModel[] = [
			{
				el: farCanvas,
				seed: 104,
				minH: 0.45,
				maxH: 0.9,
				body: '#090e0b',
				rim: false,
				antennaChance: 0.4,
				stepChance: 0.35,
				winW: 3,
				winH: 5,
				gapX: 7,
				gapY: 10,
				d: 32,
				m: 16,
				buildings: []
			},
			{
				el: midCanvas,
				seed: 42,
				minH: 0.3,
				maxH: 0.72,
				body: '#060a08',
				rim: true,
				antennaChance: 0.35,
				stepChance: 0.5,
				winW: 4,
				winH: 6,
				gapX: 9,
				gapY: 12,
				d: 20,
				m: 12,
				buildings: []
			},
			{
				el: nearCanvas,
				seed: 17,
				minH: 0.18,
				maxH: 0.52,
				body: '#040705',
				rim: true,
				antennaChance: 0.25,
				stepChance: 0.6,
				winW: 5,
				winH: 7,
				gapX: 11,
				gapY: 14,
				d: 14,
				m: 8,
				buildings: []
			}
		];

		// Pre-compute geometries only on resize so rendering loop is near zero overhead
		function buildGeometry(layer: LayerModel, w: number, h: number) {
			const count = w < 640 ? layer.m : layer.d;
			const bw = w / count;
			const rand = rng(layer.seed);
			const list: BuildingData[] = [];

			for (let i = 0; i < count; i++) {
				const bh = Math.round(h * (layer.minH + rand() * (layer.maxH - layer.minH)));
				const x = Math.round(i * bw);
				const y = h - bh;
				const currentBw = Math.max(12, Math.round(bw - 2));

				const b: BuildingData = {
					rects: [],
					rims: [],
					windows: []
				};

				const hasStep = rand() < layer.stepChance && currentBw > 20;
				if (hasStep) {
					const stepY = y + Math.round(bh * (0.25 + rand() * 0.2));
					const inset = Math.round(currentBw * 0.18);
					b.rects.push({ x: x + 1, y: stepY, w: currentBw, h: h - stepY });
					b.rects.push({ x: x + 1 + inset, y, w: currentBw - inset * 2, h: stepY - y });

					if (layer.rim) {
						b.rims.push({ x: x + 1 + inset, y, w: currentBw - inset * 2 });
						b.rims.push({ x: x + 1, y: stepY, w: inset });
						b.rims.push({ x: x + 1 + currentBw - inset, y: stepY, w: inset });
					}
				} else {
					b.rects.push({ x: x + 1, y, w: currentBw, h: bh });
					if (layer.rim) {
						b.rims.push({ x: x + 1, y, w: currentBw });
					}
				}

				if (rand() < layer.antennaChance) {
					const antX = x + Math.round(currentBw * 0.5);
					const antH = Math.round(14 + rand() * 22);
					b.antenna = { x: antX, topY: y - antH, bottomY: y };
				}

				const sideMargin = Math.max(4, Math.round((currentBw % layer.gapX) / 2) + 3);
				const buildingActivity = rand();

				for (let wy = y + 12; wy < h - 10; wy += layer.gapY) {
					const floorAwake = rand() < (0.35 + buildingActivity * 0.5);
					for (let wx = x + sideMargin; wx < x + currentBw - sideMargin - layer.winW; wx += layer.gapX) {
						const seedWin = rand();
						if (floorAwake && seedWin < 0.85) {
							let lightCol = amber;
							if (seedWin < 0.25) lightCol = lamp;
							else if (seedWin < 0.4) lightCol = coolCyan;
							else if (seedWin < 0.7) lightCol = warmAmber;

							b.windows.push({
								x: wx,
								y: wy,
								w: layer.winW,
								h: layer.winH,
								threshold: seedWin * 0.92,
								color: lightCol
							});
						}
					}
				}

				list.push(b);
			}

			layer.buildings = list;
		}

		function drawLayer(layer: LayerModel, level: number) {
			const canvas = layer.el;
			if (!canvas) return;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			const w = canvas.clientWidth;
			const h = canvas.clientHeight;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);

			if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
				canvas.width = Math.round(w * dpr);
				canvas.height = Math.round(h * dpr);
				buildGeometry(layer, w, h);
			}

			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);

			// 1. Draw all building shapes in one fill pass
			ctx.fillStyle = layer.body;
			for (const b of layer.buildings) {
				for (const r of b.rects) {
					ctx.fillRect(r.x, r.y, r.w, r.h);
				}
			}

			// 2. Rim edges
			if (layer.rim) {
				ctx.fillStyle = rimColor;
				ctx.globalAlpha = 0.2;
				for (const b of layer.buildings) {
					for (const rim of b.rims) {
						ctx.fillRect(rim.x, rim.y, rim.w, 1);
					}
				}
				ctx.globalAlpha = 1;
			}

			// 3. Antennas & beacons
			for (const b of layer.buildings) {
				if (b.antenna) {
					ctx.strokeStyle = layer.body;
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.moveTo(b.antenna.x, b.antenna.bottomY);
					ctx.lineTo(b.antenna.x, b.antenna.topY);
					ctx.stroke();

					ctx.fillStyle = rubyBeacon;
					ctx.fillRect(b.antenna.x - 1, b.antenna.topY - 1, 2, 2);
				}
			}

			// 4. Batch windows by color (NO heavy per-window shadowBlur)
			const litGroups = new Map<string, WindowData[]>();
			for (const b of layer.buildings) {
				for (const win of b.windows) {
					if (level > win.threshold) {
						let grp = litGroups.get(win.color);
						if (!grp) {
							grp = [];
							litGroups.set(win.color, grp);
						}
						grp.push(win);
					}
				}
			}

			for (const [color, wins] of litGroups) {
				ctx.fillStyle = color;
				for (const win of wins) {
					ctx.fillRect(win.x, win.y, win.w, win.h);
				}
			}
		}

		let currentLevel = -1;
		let ticking = false;

		const render = () => {
			ticking = false;
			const y = window.scrollY;
			const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
			const p = clamp(y / (maxScroll * 0.75));

			if (root) {
				root.style.setProperty('--p', p.toFixed(3));
				root.style.setProperty('--y', y.toFixed(0));
			}

			// Quantize lighting updates to avoid redrawing canvas every single pixel
			const q = Math.round((0.25 + 0.75 * p) * 20) / 20;
			if (q !== currentLevel) {
				currentLevel = q;
				for (const layer of layers) {
					drawLayer(layer, currentLevel);
				}
			}
		};

		const onScroll = () => {
			if (!ticking) {
				ticking = true;
				requestAnimationFrame(render);
			}
		};

		const onResize = () => {
			const w = window.innerWidth;
			const h = farCanvas?.clientHeight || 300;
			for (const layer of layers) {
				buildGeometry(layer, w, h);
			}
			currentLevel = -1;
			render();
		};

		onResize();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onResize);

		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onResize);
		};
	});
</script>

<div class="skyline" bind:this={root} aria-hidden="true">
	<div class="mist"></div>
	<canvas class="city city--far" bind:this={farCanvas}></canvas>
	<canvas class="city city--mid" bind:this={midCanvas}></canvas>
	<canvas class="city city--near" bind:this={nearCanvas}></canvas>
</div>

<style>
	.skyline {
		--p: 0;
		--y: 0;
		position: fixed;
		inset: 0;
		z-index: -1;
		pointer-events: none;
		overflow: hidden;
	}

	.mist {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 46vh;
		background: radial-gradient(
			ellipse 90% 100% at 50% 100%,
			color-mix(in srgb, var(--color-lamp) 14%, transparent) 0%,
			color-mix(in srgb, var(--color-night-2) 40%, transparent) 40%,
			transparent 70%
		);
		opacity: var(--p);
	}

	.city {
		position: absolute;
		left: 0;
		bottom: -2px;
		width: 100%;
		pointer-events: none;
		will-change: transform;
	}

	.city--far {
		height: 36vh;
		opacity: 0.38;
		filter: blur(1.2px);
		transform: translate3d(0, calc(var(--y) * -0.03px), 0);
	}

	.city--mid {
		height: 30vh;
		opacity: 0.65;
		filter: blur(0.4px);
		transform: translate3d(0, calc(var(--y) * -0.07px), 0);
	}

	.city--near {
		height: 24vh;
		opacity: 0.9;
		transform: translate3d(0, calc(var(--y) * -0.12px), 0);
	}

	@media (prefers-reduced-motion: reduce) {
		.city--far,
		.city--mid,
		.city--near {
			transform: none;
		}
	}
</style>