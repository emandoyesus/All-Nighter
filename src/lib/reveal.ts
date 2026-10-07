/** Reveal-on-scroll: adds .revealed the first time the node enters the viewport. */
export function reveal(node: HTMLElement, delay = 0) {
	node.setAttribute('data-reveal', '');
	if (delay) node.style.setProperty('--reveal-delay', `${delay}ms`);

	if (typeof IntersectionObserver === 'undefined') {
		node.classList.add('revealed');
		return {};
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					node.classList.add('revealed');
					observer.disconnect();
				}
			}
		},
		{ threshold: 0.12, rootMargin: '0px 0px -32px 0px' }
	);
	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
