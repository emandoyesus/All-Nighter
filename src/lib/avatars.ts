export type AvatarPreset = {
	id: string;
	name: string;
	url: string;
	description: string;
	tagline?: string;
};

export const NOCTURNAL_AVATARS: AvatarPreset[] = [
	{
		id: 'architect',
		name: 'The Architect',
		url: '/avatars/architect.webp',
		description: 'Quiet focus & clear structure',
		tagline: 'Quiet focus'
	},
	{
		id: 'wanderer',
		name: 'The Wanderer',
		url: '/avatars/wanderer.webp',
		description: 'Looking upward, chasing ideas',
		tagline: 'Chasing ideas'
	},
	{
		id: 'listener',
		name: 'The Listener',
		url: '/avatars/listener.webp',
		description: 'Headphones on, lost in rhythm',
		tagline: 'Lost in rhythm'
	},
	{
		id: 'stargazer',
		name: 'The Stargazer',
		url: '/avatars/stargazer.webp',
		description: 'Daydreaming past midnight',
		tagline: 'Past midnight'
	},
	{
		id: 'hacker',
		name: 'The Hacker',
		url: '/avatars/hacker.webp',
		description: 'Hoodie up, code flowing',
		tagline: 'Code flowing'
	},
	{
		id: 'artist',
		name: 'The Artist',
		url: '/avatars/artist.webp',
		description: 'Late night creative spark',
		tagline: 'Creative spark'
	}
];

export const DEFAULT_AVATAR = '/avatars/architect.webp';
