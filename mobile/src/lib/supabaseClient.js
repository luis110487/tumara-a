import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured) {
  console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no están configuradas. El login, registro y chat estarán desactivados hasta que se configuren.');
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'public-anon-key-placeholder',
  { global: { fetch: async (input, options = {}) => {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    else options.signal?.addEventListener('abort', cancel, { once: true });
    const requestUrl = typeof input === 'string' ? input : input?.url || String(input);
    const storageUpload = /\/storage\/v1\/object\//.test(requestUrl) && (options.method || 'GET').toUpperCase() === 'POST';
    const timeout = setTimeout(cancel, storageUpload ? 90000 : 20000);
    try { return await fetch(input, { ...options, signal: controller.signal }); }
    finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', cancel);
    }
  } } }
);
