import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured) {
  console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no están configuradas. El login, registro y chat estarán desactivados hasta que se configuren.');
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'public-anon-key-placeholder'
);
