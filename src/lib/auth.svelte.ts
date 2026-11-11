import { supabase, isSupabaseConfigured } from '#lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

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
	loading = $state<boolean>(true);
	isGuest = $state<boolean>(false);
	isAuthenticated = $derived(Boolean(this.user || this.isGuest));
	isCloudUser = $derived(Boolean(this.user));
	displayName = $derived.by(() => {
		if (!this.user) return null;
		const isGoogle =
			this.user.app_metadata?.provider === 'google' ||
			this.user.identities?.some((id) => id.provider === 'google') ||
			Boolean(this.user.user_metadata?.iss?.includes('accounts.google.com'));

		if (isGoogle) {
			const googleFirst = extractGoogleFirstName(this.user.user_metadata, this.user.email);
			return (
				googleFirst ||
				this.user.user_metadata?.callsign ||
				this.user.email?.split('@')[0] ||
				null
			);
		}

		return (
			this.user.user_metadata?.callsign ||
			this.user.user_metadata?.full_name ||
			this.user.email?.split('@')[0] ||
			null
		);
	});
	avatarUrl = $derived.by(() => {
		if (!this.user) return null;
		return (
			this.user.user_metadata?.avatar_url ||
			this.user.user_metadata?.picture ||
			this.user.user_metadata?.avatar ||
			null
		);
	});

	constructor() {
		if (typeof window !== 'undefined') {
			try {
				this.isGuest = localStorage.getItem('an.is_guest') === '1';
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
				}
				this.loading = false;
			});
		} else {
			this.loading = false;
		}
	}

	syncUserProfile(user: User | null) {
		if (!user || typeof window === 'undefined') return;
		const isGoogle =
			user.app_metadata?.provider === 'google' ||
			user.identities?.some((id) => id.provider === 'google') ||
			Boolean(user.user_metadata?.iss?.includes('accounts.google.com'));

		const googleFirstName = extractGoogleFirstName(user.user_metadata, user.email);

		const resolvedName = isGoogle && googleFirstName
			? googleFirstName
			: (user.user_metadata?.callsign || googleFirstName || user.email?.split('@')[0]);

		if (resolvedName) {
			const cleaned = resolvedName.slice(0, 24).trim();
			try {
				localStorage.setItem('an.callsign', cleaned);
			} catch {}
			window.dispatchEvent(new CustomEvent('an:update-callsign', { detail: { name: cleaned } }));
		}

		const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
		if (avatar) {
			try {
				localStorage.setItem('an.avatar', avatar);
			} catch {}
			window.dispatchEvent(new CustomEvent('an:update-avatar', { detail: { avatar } }));
		}
	}

	continueAsGuest(callsign?: string) {
		this.isGuest = true;
		try {
			localStorage.setItem('an.is_guest', '1');
		} catch {}
	}

	async signUpWithEmail(email: string, password: string, callsign: string) {
		if (!supabase) throw new Error('Supabase is not configured');
		const emailRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}/room` : undefined;
		const res = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: { callsign },
				emailRedirectTo
			}
		});
		if (res.data?.session) {
			this.isGuest = false;
			try {
				localStorage.removeItem('an.is_guest');
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
		try {
			localStorage.removeItem('an.is_guest');
		} catch {}
		if (!supabase) return;
		return supabase.auth.signOut();
	}

	async updateProfile(updates: { callsign?: string; avatarUrl?: string }) {
		if (!supabase) throw new Error('Supabase is not configured');
		const data: Record<string, any> = {};
		if (updates.callsign !== undefined) data.callsign = updates.callsign;
		if (updates.avatarUrl !== undefined) data.avatar_url = updates.avatarUrl;
		const { data: res, error } = await supabase.auth.updateUser({ data });
		if (error) throw error;
		if (res.user) {
			this.user = res.user;
		}
		return res;
	}
}

export const auth = new AuthService();
