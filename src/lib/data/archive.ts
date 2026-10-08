import type { AssetPath } from '$app/types';

// Sample data. Replace with your own nights (dates, notes, counts) in src/lib/data/archive.ts.
export type Night = {
	date: string;
	tag: string;
	title: string;
	note: string;
	hours: string;
	tracks: number;
	heads: number;
	seed: string;
	img: AssetPath;
};

export const nights: Night[] = [
	{
		date: 'Mar 14',
		tag: 'Midterms',
		title: 'The night the race condition died',
		note: 'Two laptops arguing about error handling until the sky went orange. The fix arrived at 5:41.',
		hours: '7h 12m',
		tracks: 41,
		heads: 6,
		seed: 'all-nighter-mar14',
		img: 'nights/night-1.jpg'
	},
	{
		date: 'Apr 28',
		tag: 'Project deadline',
		title: 'Three APIs and one sunrise',
		note: 'Demo at nine. The deploy log screenshot is still pinned in the chat, next to the pizza receipt.',
		hours: '9h 03m',
		tracks: 57,
		heads: 8,
		seed: 'all-nighter-apr28',
		img: 'nights/night-2.jpg'
	},
	{
		date: 'Jun 03',
		tag: 'Finals week',
		title: 'Rain, one amplifier, no regrets',
		note: 'Someone brought a second speaker. The library closed early. We did not.',
		hours: '5h 47m',
		tracks: 33,
		heads: 5,
		seed: 'all-nighter-jun03',
		img: 'nights/night-3.jpg'
	},
	{
		date: 'Sep 22',
		tag: 'First lock-in',
		title: 'New group chat, same couch',
		note: 'Fresh semester, old rituals. Nobody remembered to eat dinner, everybody remembered the aux rules.',
		hours: '6h 28m',
		tracks: 46,
		heads: 7,
		seed: 'all-nighter-sep22',
		img: 'nights/night-4.jpg'
	}
];
