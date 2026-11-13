import { nights, contributors } from '#lib/data/archive';
import { SITE_URL } from '#lib/config';
import type { RequestHandler } from './$types';

export const prerender = true;

interface SitemapEntry {
	path: string;
	changefreq: string;
	priority: string;
	lastmod?: string;
}

export const GET: RequestHandler = async () => {
	const staticPages: SitemapEntry[] = [
		{ path: '', changefreq: 'daily', priority: '1.0' },
		{ path: '/room', changefreq: 'always', priority: '0.9' },
		{ path: '/archive', changefreq: 'daily', priority: '0.8' }
	];

	const archivePages: SitemapEntry[] = nights.map((night) => ({
		path: `/archive/${night.slug}`,
		lastmod: night.iso ? night.iso.slice(0, 10) : undefined,
		changefreq: 'monthly',
		priority: '0.7'
	}));

	const crewPages: SitemapEntry[] = contributors().map((person) => ({
		path: `/crew/${encodeURIComponent(person)}`,
		changefreq: 'weekly',
		priority: '0.6'
	}));

	const allPages: SitemapEntry[] = [...staticPages, ...archivePages, ...crewPages];
	const todayIso = new Date().toISOString().slice(0, 10);

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allPages
	.map(
		(p) => `  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <lastmod>${p.lastmod || todayIso}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`.trim();

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
};
