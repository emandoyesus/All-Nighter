import {
	gsap,
	prefersReducedMotion,
	ScrollTrigger,
	setupGsap,
	SplitText
} from '#lib/motion';

type SplitRevealOptions = {
	delay?: number;
	duration?: number;
	stagger?: number;
	yPercent?: number;
	rotate?: number;
	scroll?: boolean;
	start?: string;
};

/**
 * Masked word reveal for headlines. Splits once per layout, re-splits on resize
 * and font load, and keeps the static text as the no-JS fallback.
 */
export function splitReveal(node: HTMLElement, options: SplitRevealOptions = {}) {
	node.setAttribute('data-split', '');

	if (typeof window === 'undefined') return {};
	if (prefersReducedMotion()) return {};

	setupGsap();
	gsap.set(node, { opacity: 1 });

	const {
		delay = 0,
		duration = 1,
		stagger = 0.045,
		yPercent = 115,
		rotate = 3,
		scroll = true,
		start = 'top 90%'
	} = options;

	let split: SplitText | undefined;
	let trigger: ScrollTrigger | undefined;
	let revealed = false;

	try {
		split = SplitText.create(node, {
			type: 'lines,words',
			mask: 'lines',
			autoSplit: true,
			linesClass: 'split-line',
			wordsClass: 'split-word',
			onSplit: (self) => {
				trigger?.kill();

				if (revealed) {
					gsap.set(self.words, { yPercent: 0, rotate: 0 });
					return;
				}

				const tween = gsap.from(self.words, {
					yPercent,
					rotate,
					duration,
					ease: 'power4.out',
					stagger,
					delay,
					scrollTrigger: scroll ? { trigger: node, start, once: true } : undefined,
					onComplete: () => {
						revealed = true;
					}
				});
				trigger = tween.scrollTrigger;
				return tween;
			}
		});
	} catch {
		gsap.set(node, { opacity: 1 });
	}

	return {
		destroy() {
			trigger?.kill();
			split?.revert();
		}
	};
}
