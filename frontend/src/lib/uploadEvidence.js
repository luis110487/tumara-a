import { supabase } from './supabaseClient';

export async function uploadEvidencePhoto(file) {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || 'anon';
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
  const { error } = await supabase.storage.from('evidence').upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('evidence').getPublicUrl(fileName);
  return data.publicUrl;
}
