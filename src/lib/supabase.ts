import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Project credentials with environment overrides and guaranteed defaults
const DEFAULT_URL = 'https://ynxdidworqqttfhwamoe.supabase.co';
const DEFAULT_KEY = 'sb_publishable_PsRaDU-auMcUzzWu0yWRBg_OqIaxwOM';

const supabaseUrl =
	import.meta.env.PUBLIC_SUPABASE_URL ||
	import.meta.env.VITE_SUPABASE_URL ||
	DEFAULT_URL;

const supabaseAnonKey =
	import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
	import.meta.env.VITE_SUPABASE_ANON_KEY ||
	DEFAULT_KEY;

export const isSupabaseConfigured = Boolean(
	supabaseUrl &&
	supabaseAnonKey &&
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
