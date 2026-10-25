import {
	gsap,
	prefersReducedMotion,
	ScrollTrigger,
	setupGsap,
	SplitText
} from '#lib/motion';

type ScrubWordsOptions = {
	start?: string;
	end?: string;
	from?: number;
	stagger?: number;
};

/** Scrubs word opacity against scroll progress. */
export function scrubWords(node: HTMLElement, options: ScrubWordsOptions = {}) {
	node.setAttribute('data-scrub', '');

	if (typeof window === 'undefined') return {};
	if (prefersReducedMotion()) return {};

	setupGsap();

	const {
		start = 'top 85%',
		end = 'bottom bottom',
		from = 0.18,
		stagger = 0.08
	} = options;
	const scope = node.closest('section') ?? node;

	let split: SplitText | undefined;
	let trigger: ScrollTrigger | undefined;

	try {
		split = SplitText.create(node, {
			type: 'words',
			autoSplit: true,
			wordsClass: 'scrub-word',
			onSplit: (self) => {
				trigger?.kill();
				const tween = gsap.fromTo(
					self.words,
					{ opacity: from },
					{
						opacity: 1,
						stagger,
						ease: 'none',
						scrollTrigger: { trigger: scope, start, end, scrub: 0.5 }
					}
				);
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
