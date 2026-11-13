<script lang="ts">
	import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, DEFAULT_OG_IMAGE } from '#lib/config';

	interface SeoProps {
		title?: string;
		description?: string;
		canonical?: string;
		type?: string;
		image?: string;
		imageAlt?: string;
		keywords?: string | string[];
		noindex?: boolean;
		jsonLd?: Record<string, any> | Array<Record<string, any>> | null;
		rawTitle?: boolean;
	}

	let {
		title,
		description = SITE_DESCRIPTION,
		canonical = '',
		type = 'website',
		image,
		imageAlt = 'All Nighter — Doors open at sunset. Lock in till sunrise.',
		keywords = [
			'all-nighter',
			'focus room',
			'dev lock-in',
			'synchronized study',
			'late night coding',
			'ethio jazz',
			'pomodoro countdown',
			'dawn ritual',
			'collaborative queue'
		],
		noindex = false,
		jsonLd = null,
		rawTitle = false
	}: SeoProps = $props();

	const computedTitle = $derived.by(() => {
		if (!title) return `${SITE_NAME} · Doors open at sunset. Lock in till sunrise.`;
		if (rawTitle || title.includes('All Nighter')) return title;
		return `${title} · ${SITE_NAME}`;
	});

	const computedCanonical = $derived.by(() => {
		if (!canonical) return SITE_URL;
		if (canonical.startsWith('http://') || canonical.startsWith('https://')) return canonical;
		const cleanPath = canonical.startsWith('/') ? canonical : `/${canonical}`;
		return `${SITE_URL}${cleanPath}`;
	});

	const computedImage = $derived.by(() => {
		if (!image) return DEFAULT_OG_IMAGE;
		if (image.startsWith('http://') || image.startsWith('https://')) return image;
		const cleanPath = image.startsWith('/') ? image : `/${image}`;
		return `${SITE_URL}${cleanPath}`;
	});

	const keywordsString = $derived(
		Array.isArray(keywords) ? keywords.join(', ') : keywords
	);

	const jsonLdHtml = $derived.by(() => {
		if (!jsonLd) return '';
		const serialized = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
		return `<script type="application/ld+json">${serialized}</` + `script>`;
	});
</script>

<svelte:head>
	<title>{computedTitle}</title>
	<meta name="title" content={computedTitle} />
	<meta name="description" content={description} />
	{#if keywordsString}
		<meta name="keywords" content={keywordsString} />
	{/if}

	<!-- Canonical link -->
	<link rel="canonical" href={computedCanonical} />

	<!-- Robots -->
	{#if noindex}
		<meta name="robots" content="noindex, follow" />
	{:else}
		<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
	{/if}

	<!-- Open Graph / Facebook / Discord / Telegram -->
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:url" content={computedCanonical} />
	<meta property="og:title" content={computedTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={computedImage} />
	<meta property="og:image:secure_url" content={computedImage} />
	<meta property="og:image:alt" content={imageAlt} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:locale" content="en_US" />

	<!-- Twitter / X -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={computedCanonical} />
	<meta name="twitter:title" content={computedTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={computedImage} />
	<meta name="twitter:image:alt" content={imageAlt} />

	<!-- Structured Data (JSON-LD) -->
	{#if jsonLdHtml}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html jsonLdHtml}
	{/if}
</svelte:head>
