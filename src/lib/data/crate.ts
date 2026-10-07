// Verified, embeddable 24/7 picks. The crate fills in when the crew queue is empty.
// Thumbnails come from i.ytimg.com using these same ids.
export type CratePick = {
	videoId: string;
	title: string;
	channel: string;
	note: string;
};

export const crate: CratePick[] = [
	{
		videoId: 'rFZHOHl-L8A',
		title: 'beats to relax / study to',
		channel: 'Lofi Girl',
		note: 'the default mood'
	},
	{
		videoId: 'JD-kMIpDfnY',
		title: 'beats to sleep / chill to',
		channel: 'Lofi Girl',
		note: 'for the 4am wall'
	},
	{
		videoId: '5yx6BWlEVcY',
		title: 'Chillhop Radio',
		channel: 'Chillhop Music',
		note: 'jazzy and warm'
	},
	{
		videoId: '2CDRu6-Vgfo',
		title: 'shinjuku fm, soft lofi / smooth jazz',
		channel: 'TOKYO TONES',
		note: 'rainy night in Tokyo'
	},
	{
		videoId: 'UjlMEqTu2KI',
		title: 'Nightride FM, synthwave radio',
		channel: 'Nightride FM',
		note: 'when the deadline gets loud'
	}
];
