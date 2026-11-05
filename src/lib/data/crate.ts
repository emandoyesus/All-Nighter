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
		videoId: '1-xGerv5FOk',
		title: 'Alone',
		channel: 'Alan Walker',
		note: 'late night anthem'
	},
	{
		videoId: '4NRXx6U8ABQ',
		title: 'Blinding Lights',
		channel: 'The Weeknd',
		note: 'midnight driving energy'
	}
];
