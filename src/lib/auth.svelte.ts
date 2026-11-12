import { supabase, isSupabaseConfigured } from '#lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { syncUserStatsOnAuth, resetActiveStatsToGuest } from '#lib/data/profile-stats';
import { syncMyNightsOnAuth, resetActiveLogbookToGuest } from '#lib/data/local-logbook';
import { DEFAULT_AVATAR } from '#lib/avatars';

export interface CachedAuthProfile {
	id: string;
	email: string | null;
	displayName: string;
	avatarUrl: string | null;
	provider?: string;
}

export function extractGoogleFirstName(metadata: any, email?: string | null): string {
	if (!metadata && !email) return '';
	if (metadata?.given_name && typeof metadata.given_name === 'string') {
		const given = metadata.given_name.trim();
		if (given) return given.split(/\s+/)[0];
	}
	const raw =
		metadata?.full_name ||
		metadata?.name ||
		metadata?.user_name ||
		(email ? email.split('@')[0] : '');
	if (!raw || typeof raw !== 'string') return '';
	const trimmed = raw.trim();
	return trimmed.split(/\s+/)[0] || trimmed;
}

class AuthService {
	user = $state<User | null>(null);
	session = $state<Session | null>(null);
	cachedUser = $state<CachedAuthProfile | null>(null);
	loading = $state<boolean>(true);
	isGuest = $state<boolean>(false);
	isAuthenticated = $derived(Boolean(this.user || this.cachedUser || this.isGuest));
	isCloudUser = $derived(Boolean(this.user || this.cachedUser));
	email = $derived(this.user?.email || this.cachedUser?.email || null);
	displayName = $derived.by(() => {
		if (this.user) {
			// 1. Explicit custom callsign saved in user metadata
			const customCallsign =
				this.user.user_metadata?.custom_callsign ||
				this.user.user_metadata?.callsign;

			if (customCallsign && typeof customCallsign === 'string' && customCallsign.trim()) {
				return customCallsign.trim().slice(0, 24);
			}

			// 2. Persistent profile for this user ID in localStorage
			if (typeof localStorage !== 'undefined') {
				try {
					const saved = localStorage.getItem(`an.profile.${this.user.id}`);
					if (saved) {
						const parsed = JSON.parse(saved);
						if (parsed.callsign) return parsed.callsign;
					}
				} catch {}
			}

			// 3. Fallback to Google first name
			const isGoogle =
				this.user.app_metadata?.provider === 'google' ||
				this.user.identities?.some((id) => id.provider === 'google') ||
				Boolean(this.user.user_metadata?.iss?.includes('accounts.google.com'));

			if (isGoogle) {
				const googleFirst = extractGoogleFirstName(this.user.user_metadata, this.user.email);
				if (googleFirst) return googleFirst;
			}

			return (
				this.user.user_metadata?.full_name ||
				this.user.email?.split('@')[0] ||
				null
			);
		}

		if (this.cachedUser?.displayName) {
			return this.cachedUser.displayName;
		}

		return null;
	});
	avatarUrl = $derived.by(() => {
		if (this.user) {
			const useGoogle = Boolean(this.user.user_metadata?.use_google_avatar);
			const googlePhoto = this.user.user_metadata?.picture || this.user.user_metadata?.avatar_url;

			if (useGoogle && googlePhoto) {
				return googlePhoto;
			}

			// 1. Explicit custom avatar saved in user metadata
			const customAvatar =
				this.user.user_metadata?.custom_avatar ||
				(this.user.user_metadata?.profile_edited ? this.user.user_metadata?.avatar_url : null);

			if (customAvatar && typeof customAvatar === 'string' && customAvatar.trim()) {
				return customAvatar.trim();
			}

			// 2. Persistent profile for this user ID in localStorage
			if (typeof localStorage !== 'undefined') {
				try {
					const saved = localStorage.getItem(`an.profile.${this.user.id}`);
					if (saved) {
						const parsed = JSON.parse(saved);
						if (parsed.avatarUrl) return parsed.avatarUrl;
					}
					const localAvatar = localStorage.getItem('an.avatar');
					if (localAvatar) return localAvatar;
				} catch {}
			}

			// 3. Fallback to default avatar (never forced to Google photo unless user explicitly chose it)
			return DEFAULT_AVATAR;
		}

		if (this.cachedUser?.avatarUrl) {
			return this.cachedUser.avatarUrl;
		}

		return null;
	});

	constructor() {
		if (typeof window !== 'undefined') {
			try {
				this.isGuest = localStorage.getItem('an.is_guest') === '1';
				const raw = localStorage.getItem('an.auth_cache');
				if (raw) {
					this.cachedUser = JSON.parse(raw);
				}

				// If an.auth_cache is not yet set, inspect Supabase's persisted session token directly from localStorage
				if (!this.cachedUser) {
					for (let i = 0; i < localStorage.length; i++) {
						const key = localStorage.key(i);
						if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
							try {
								const parsed = JSON.parse(localStorage.getItem(key) || '{}');
								const u = parsed?.user;
								if (u) {
									let savedCallsign: string | null = null;
									let savedAvatar: string | null = null;
									try {
										const saved = localStorage.getItem(`an.profile.${u.id}`);
										if (saved) {
											const p = JSON.parse(saved);
											savedCallsign = p.callsign || null;
											savedAvatar = p.avatarUrl || null;
										}
									} catch {}

									const customCallsign =
										u.user_metadata?.custom_callsign ||
										u.user_metadata?.callsign ||
										savedCallsign;

									const isGoogle =
										u.app_metadata?.provider === 'google' ||
										u.identities?.some((id: any) => id.provider === 'google') ||
										Boolean(u.user_metadata?.iss?.includes('accounts.google.com'));
									const googleFirst = extractGoogleFirstName(u.user_metadata, u.email);

									const resolvedName =
										customCallsign ||
										(isGoogle && googleFirst ? googleFirst : (googleFirst || u.email?.split('@')[0]));

									const customAvatar =
										u.user_metadata?.custom_avatar ||
										(u.user_metadata?.profile_edited ? u.user_metadata?.avatar_url : null) ||
										savedAvatar;

									const avatar =
										customAvatar ||
										(u.user_metadata?.avatar_url as string | undefined) ||
										(u.user_metadata?.picture as string | undefined) ||
										(u.user_metadata?.avatar as string | undefined);

									this.cachedUser = {
										id: u.id,
										email: u.email || null,
										displayName: resolvedName || 'night-owl',
										avatarUrl: avatar || null,
										provider: u.app_metadata?.provider || (isGoogle ? 'google' : 'email')
									};
									// Persist back so subsequent checks are instant
									localStorage.setItem('an.auth_cache', JSON.stringify(this.cachedUser));
									break;
								}
							} catch {}
						}
					}
				}

				// Also synchronize avatar and callsign fallbacks if available
				const localAvatar = localStorage.getItem('an.avatar');
				const localCallsign = localStorage.getItem('an.callsign');
				if ((!this.cachedUser || !this.cachedUser.avatarUrl) && (localAvatar || localCallsign)) {
					this.cachedUser = {
						id: this.cachedUser?.id || 'cached-local',
						email: this.cachedUser?.email || null,
						displayName: this.cachedUser?.displayName || localCallsign || 'night-owl',
						avatarUrl: this.cachedUser?.avatarUrl || localAvatar || null
					};
				}
			} catch {}
		}

		if (typeof window !== 'undefined' && isSupabaseConfigured && supabase) {
			supabase.auth.getSession().then(({ data: { session } }) => {
				this.session = session;
				this.user = session?.user ?? null;
				if (this.user) {
					this.isGuest = false;
					this.syncUserProfile(this.user);
					window.dispatchEvent(new CustomEvent('an:auth-changed'));
				} else {
					// Supabase confirmed no active session: clear stale cache
					this.cachedUser = null;
					try {
						localStorage.removeItem('an.auth_cache');
					} catch {}
				}
				this.loading = false;
			}).catch(() => {
				this.loading = false;
			});

			supabase.auth.onAuthStateChange((_event, session) => {
				this.session = session;
				this.user = session?.user ?? null;
				if (this.user) {
					this.isGuest = false;
					try {
						localStorage.removeItem('an.is_guest');
					} catch {}
					this.syncUserProfile(this.user);
					window.dispatchEvent(new CustomEvent('an:auth-changed'));
				} else {
					this.cachedUser = null;
					try {
						localStorage.removeItem('an.auth_cache');
					} catch {}
					window.dispatchEvent(new CustomEvent('an:auth-changed'));
				}
				this.loading = false;
			});
		} else {
			this.loading = false;
		}
	}

	syncUserProfile(user: User | null) {
		if (!user || typeof window === 'undefined') return;

		let savedCallsign: string | null = null;
		let savedAvatar: string | null = null;
		let savedUseGoogle: boolean | null = null;
		try {
			const saved = localStorage.getItem(`an.profile.${user.id}`);
			if (saved) {
				const p = JSON.parse(saved);
				savedCallsign = p.callsign || null;
				savedAvatar = p.avatarUrl || null;
				if (p.useGoogleAvatar !== undefined) savedUseGoogle = p.useGoogleAvatar;
			}
			const localAvatar = localStorage.getItem('an.avatar');
			if (!savedAvatar && localAvatar && !localAvatar.includes('googleusercontent.com')) {
				savedAvatar = localAvatar;
			}
		} catch {}

		const customCallsign =
			user.user_metadata?.custom_callsign ||
			user.user_metadata?.callsign ||
			savedCallsign;

		const isGoogle =
			user.app_metadata?.provider === 'google' ||
			user.identities?.some((id) => id.provider === 'google') ||
			Boolean(user.user_metadata?.iss?.includes('accounts.google.com'));

		const googleFirstName = extractGoogleFirstName(user.user_metadata, user.email);

		const resolvedName =
			customCallsign ||
			(isGoogle && googleFirstName ? googleFirstName : (googleFirstName || user.email?.split('@')[0]));

		const useGoogle =
			user.user_metadata?.use_google_avatar !== undefined
				? Boolean(user.user_metadata.use_google_avatar)
				: (savedUseGoogle !== null ? savedUseGoogle : false);

		const customAvatar =
			user.user_metadata?.custom_avatar ||
			(user.user_metadata?.profile_edited ? user.user_metadata?.avatar_url : null) ||
			savedAvatar;

		const googlePhoto =
			user.user_metadata?.picture ||
			user.user_metadata?.avatar_url ||
			null;

		const avatar =
			(useGoogle && googlePhoto ? googlePhoto : null) ||
			customAvatar ||
			savedAvatar ||
			DEFAULT_AVATAR;

		// Synchronously update and save cache
		const cacheEntry: CachedAuthProfile = {
			id: user.id,
			email: user.email || null,
			displayName: resolvedName || 'night-owl',
			avatarUrl: avatar || null,
			provider: user.app_metadata?.provider || (isGoogle ? 'google' : 'email')
		};
		this.cachedUser = cacheEntry;
		try {
			localStorage.setItem('an.auth_cache', JSON.stringify(cacheEntry));
			if (user.id) {
				localStorage.setItem(
					`an.profile.${user.id}`,
					JSON.stringify({ callsign: resolvedName, avatarUrl: avatar })
				);
			}
		} catch {}

		if (resolvedName) {
			const cleaned = resolvedName.slice(0, 24).trim();
			try {
				localStorage.setItem('an.callsign', cleaned);
			} catch {}
			window.dispatchEvent(new CustomEvent('an:update-callsign', { detail: { name: cleaned } }));
		}

		if (avatar) {
			try {
				localStorage.setItem('an.avatar', avatar);
			} catch {}
			window.dispatchEvent(new CustomEvent('an:update-avatar', { detail: { avatar } }));
		}

		// Sync persistent user stats, levels & achievements, and session logbook with profile
		syncUserStatsOnAuth(user);
		syncMyNightsOnAuth(user);

		// Check if user has explicitly configured their profile after signin/signup
		const isConfigured = Boolean(
			user.user_metadata?.profile_configured ||
			(typeof localStorage !== 'undefined' && localStorage.getItem('an.profile_configured') === user.id)
		);

		if (!isConfigured) {
			setTimeout(() => {
				window.dispatchEvent(new CustomEvent('an:open-profile-setup'));
			}, 250);
		}
	}

	continueAsGuest(callsign?: string) {
		this.isGuest = true;
		try {
			localStorage.setItem('an.is_guest', '1');
		} catch {}
	}

	async signUpWithEmail(email: string, password: string, callsign: string, avatarUrl?: string) {
		if (!supabase) throw new Error('Supabase is not configured');
		const emailRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}/room` : undefined;
		const chosenAvatar = avatarUrl || DEFAULT_AVATAR;
		const res = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					callsign,
					custom_callsign: callsign,
					avatar_url: chosenAvatar,
					custom_avatar: chosenAvatar,
					profile_edited: true,
					profile_configured: true,
					use_google_avatar: false
				},
				emailRedirectTo
			}
		});
		if (res.data?.session) {
			this.isGuest = false;
			try {
				localStorage.removeItem('an.is_guest');
				localStorage.setItem('an.avatar', chosenAvatar);
			} catch {}
		}
		return res;
	}

	async signInWithEmail(email: string, password: string) {
		if (!supabase) throw new Error('Supabase is not configured');
		const res = await supabase.auth.signInWithPassword({
			email,
			password
		});
		if (res.data?.session) {
			this.isGuest = false;
			try {
				localStorage.removeItem('an.is_guest');
			} catch {}
		}
		return res;
	}

	async signInWithGoogle(customRedirectTo?: string) {
		if (!supabase) throw new Error('Supabase is not configured');
		const currentUrl =
			typeof window !== 'undefined'
				? window.location.search
					? `${window.location.origin}${window.location.pathname}${window.location.search}`
					: `${window.location.origin}/room`
				: undefined;
		const redirectTo = customRedirectTo || currentUrl;
		const res = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo
			}
		});
		if (res.error) throw res.error;
		return res;
	}

	async signOut() {
		this.isGuest = false;
		this.cachedUser = null;
		this.user = null;
		this.session = null;
		try {
			localStorage.removeItem('an.is_guest');
			localStorage.removeItem('an.auth_cache');
			localStorage.removeItem('an.callsign');
			localStorage.removeItem('an.avatar');
			resetActiveStatsToGuest();
			resetActiveLogbookToGuest();
		} catch {}
		if (!supabase) return;
		return supabase.auth.signOut();
	}

	async updateProfile(updates: { callsign?: string; avatarUrl?: string; profileConfigured?: boolean; useGoogleAvatar?: boolean }) {
		if (!supabase) throw new Error('Supabase is not configured');
		const data: Record<string, any> = {};
		if (updates.callsign !== undefined) {
			data.callsign = updates.callsign;
			data.custom_callsign = updates.callsign;
		}
		if (updates.avatarUrl !== undefined) {
			data.avatar_url = updates.avatarUrl;
			data.custom_avatar = updates.avatarUrl;
			data.profile_edited = true;
		}
		if (updates.profileConfigured !== undefined) data.profile_configured = updates.profileConfigured;
		if (updates.useGoogleAvatar !== undefined) data.use_google_avatar = updates.useGoogleAvatar;

		// Persist locally per user ID immediately
		if (this.user?.id && typeof localStorage !== 'undefined') {
			try {
				const existing = localStorage.getItem(`an.profile.${this.user.id}`);
				const parsed = existing ? JSON.parse(existing) : {};
				if (updates.callsign !== undefined) parsed.callsign = updates.callsign;
				if (updates.avatarUrl !== undefined) parsed.avatarUrl = updates.avatarUrl;
				if (updates.useGoogleAvatar !== undefined) parsed.useGoogleAvatar = updates.useGoogleAvatar;
				localStorage.setItem(`an.profile.${this.user.id}`, JSON.stringify(parsed));
				if (updates.avatarUrl) {
					localStorage.setItem('an.avatar', updates.avatarUrl);
				}
			} catch {}
		}

		const { data: res, error } = await supabase.auth.updateUser({ data });
		if (error) throw error;
		if (res.user) {
			this.user = res.user;
			this.syncUserProfile(res.user);
		}
		return res;
	}
}

export const auth = new AuthService();
