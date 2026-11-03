import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Environment variables can be provided via .env (Vite PUBLIC_SUPABASE_*)
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
	supabaseUrl &&
	supabaseAnonKey &&
	!supabaseUrl.includes('YOUR_PROJECT') &&
	supabaseUrl.startsWith('http')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
	? createClient(supabaseUrl, supabaseAnonKey, {
			auth: {
				persistSession: true,
				autoRefreshToken: true
			},
			realtime: {
				params: {
					eventsPerSecond: 10
				}
			}
		})
	: null;
