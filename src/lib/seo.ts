import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from './config';
import type { Night, CrewProfile } from './data/archive';

export function buildWebSiteSchema() {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE_NAME,
		url: SITE_URL,
		description: SITE_DESCRIPTION,
		inLanguage: 'en-US',
		publisher: {
			'@type': 'Organization',
			name: SITE_NAME,
			url: SITE_URL,
			logo: {
				'@type': 'ImageObject',
				url: `${SITE_URL}/favicon.svg`
			}
		}
	};
}

export function buildWebApplicationSchema() {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: SITE_NAME,
		url: SITE_URL,
		applicationCategory: 'ProductivityApplication',
		operatingSystem: 'All',
		browserRequirements: 'Requires JavaScript. Requires HTML5 audio/video.',
		description: SITE_DESCRIPTION,
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD'
		},
		featureList: [
			'Synchronized Live YouTube Audio Stream with Clock Drift Compensation',
			'Focus & Normal Mode Intervals with Ambient Audio Chimes',
			'Fullscreen Distraction-Free Midnight Desk HUD',
			'Collaborative Song Queue with Peer Dedications',
			'Sunset to Dawn Unbroken Countdown Timer',
			'Sunrise Ritual and Chronological Logbook Archive'
		]
	};
}

export function buildBreadcrumbs(items: Array<{ name: string; path: string }>) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: item.path.startsWith('http') ? item.path : `${SITE_URL}${item.path.startsWith('/') ? '' : '/'}${item.path}`
		}))
	};
}

export function buildArchiveCollectionSchema(allNights: Night[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: 'All Nighter Archive',
		url: `${SITE_URL}/archive`,
		description: 'Chronological logbook of overnight focus sessions, tracklists, intentions, and crew rosters.',
		mainEntity: {
			'@type': 'ItemList',
			numberOfItems: allNights.length,
			itemListElement: allNights.map((night, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				url: `${SITE_URL}/archive/${night.slug}`,
				name: night.title
			}))
		}
	};
}

export function buildNightSchema(night: Night) {
	const tracks = (night.tracklist || []).map((t, index) => ({
		'@type': 'MusicRecording',
		position: index + 1,
		name: t.title,
		byArtist: {
			'@type': 'MusicGroup',
			name: t.artist
		},
		genre: t.genre
	}));

	return {
		'@context': 'https://schema.org',
		'@type': 'MusicPlaylist',
		name: night.title,
		description: night.note || `${night.title} focus session on All Nighter`,
		url: `${SITE_URL}/archive/${night.slug}`,
		numTracks: tracks.length,
		datePublished: night.iso ? night.iso.slice(0, 10) : undefined,
		track: tracks
	};
}

export function buildCrewProfileSchema(profile: CrewProfile, avatarUrl: string) {
	const fullAvatar = avatarUrl.startsWith('http') ? avatarUrl : `${SITE_URL}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
	return {
		'@context': 'https://schema.org',
		'@type': 'ProfilePage',
		name: `${profile.name} · Crew Profile`,
		url: `${SITE_URL}/crew/${encodeURIComponent(profile.name)}`,
		mainEntity: {
			'@type': 'Person',
			name: profile.name,
			image: fullAvatar,
			description: `All Nighter nocturnal builder with ${profile.allNighters} completed sessions and top artist ${profile.topArtist}.`
		}
	};
}
