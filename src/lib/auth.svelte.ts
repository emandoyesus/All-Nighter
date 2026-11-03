import { supabase, isSupabaseConfigured } from '#lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

class AuthService {
	user = $state<User | null>(null);
	session = $state<Session | null>(null);
	loading = $state<boolean>(true);
	isAuthenticated = $derived(Boolean(this.user));
	displayName = $derived.by(() => {
		if (!this.user) return null;
		return (
			this.user.user_metadata?.callsign ||
			this.user.user_metadata?.full_name ||
			this.user.email?.split('@')[0] ||
			null
		);
	});

	constructor() {
		if (typeof window !== 'undefined' && isSupabaseConfigured && supabase) {
			supabase.auth.getSession().then(({ data: { session } }) => {
				this.session = session;
				this.user = session?.user ?? null;
				this.loading = false;
			}).catch(() => {
				this.loading = false;
			});

			supabase.auth.onAuthStateChange((_event, session) => {
				this.session = session;
				this.user = session?.user ?? null;
				this.loading = false;
			});
		} else {
			this.loading = false;
		}
	}

	async signUpWithEmail(email: string, password: string, callsign: string) {
		if (!supabase) throw new Error('Supabase is not configured');
		return supabase.auth.signUp({
			email,
			password,
			options: {
				data: { callsign }
			}
		});
	}

	async signInWithEmail(email: string, password: string) {
		if (!supabase) throw new Error('Supabase is not configured');
		return supabase.auth.signInWithPassword({
			email,
			password
		});
	}

	async signOut() {
		if (!supabase) return;
		return supabase.auth.signOut();
	}
}

export const auth = new AuthService();
