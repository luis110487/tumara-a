import { supabase } from './supabaseClient';
import { apiFetch, AuthRequiredError } from './apiClient';

export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
const MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const uploaded = new WeakMap();
export function photoError(error) {
  const message = String(error?.message || '');
  if (error instanceof AuthRequiredError || /jwt|token.*expir|unauthorized/i.test(message)) return 'Tu sesión venció. Inicia sesión de nuevo para subir la foto.';
  if (/bucket.*not found|bucket.*does not exist/i.test(message)) return 'El almacenamiento de fotos no está disponible. Es necesario revisar su configuración.';
  if (/row.level|policy|permission|not authorized|access denied/i.test(message)) return 'El servidor no permitió guardar la foto. Es necesario revisar los permisos del almacenamiento.';
  if (/abort|timeout|network|fetch|connection/i.test(message)) return 'La subida se interrumpió. Revisa tu conexión y pulsa Reintentar foto.';
  return message || 'No pudimos subir la foto. Inténtalo de nuevo.';
}
export async function preparePhoto(file) {
  if (!file?.size) throw new Error('El archivo está vacío. Selecciona otra foto.');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('La foto supera los 20 MB. Selecciona una imagen más pequeña.');
  let type = file.type;
  if (!type || type === 'application/octet-stream') {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) type = 'image/jpeg';
    else if ([137,80,78,71,13,10,26,10].every((n, i) => bytes[i] === n)) type = 'image/png';
    else if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') type = 'image/webp';
  }
  if (!MIME[type]) throw new Error('Elige una imagen JPG, PNG o WebP de hasta 20 MB. Convierte las fotos HEIC a JPG antes de subirlas.');
  if (file.size <= 2 * 1024 * 1024) return { blob: file.type === type ? file : new Blob([file], { type }), extension: MIME[type], type };
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('No pudimos leer esa imagen. Selecciona otra foto.')); image.src = url; });
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No pudimos preparar la foto. Selecciona otra imagen.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .82));
    if (!blob || blob.size > 5 * 1024 * 1024) throw new Error('No pudimos reducir la foto. Selecciona una imagen más pequeña.');
    return { blob, extension: 'jpg', type: 'image/jpeg' };
  } finally { URL.revokeObjectURL(url); }
}
export async function uploadPhoto(file, bucket = 'avatars') {
  if (!['avatars', 'evidence'].includes(bucket)) throw new Error('Almacenamiento de fotos inválido.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new AuthRequiredError();
  const cacheKey = `${session.user.id}:${bucket}`;
  let cache = uploaded.get(file);
  if (!cache) { cache = new Map(); uploaded.set(file, cache); }
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const pending = (async () => {
    const prepared = await preparePhoto(file);
    const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const name = `${session.user.id}-${suffix}.${prepared.extension}`;
    const storage = supabase.storage.from(bucket);
    const { error } = await storage.upload(name, prepared.blob, { cacheControl: '3600', upsert: false, contentType: prepared.type });
    if (error) throw error;
    return storage.getPublicUrl(name).data.publicUrl;
 })();
  cache.set(cacheKey, pending);
  try { return await pending; } catch (error) { cache.delete(cacheKey); throw error; }
}

export async function savePhotoUrl(path, field, url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const profile = await apiFetch(path, { method: 'PATCH', signal: controller.signal, body: JSON.stringify({ [field]: url }) });
    if (!profile?.id || profile[field] !== url) throw new Error('La foto se subió, pero no pudimos confirmar su guardado en el perfil. Pulsa Reintentar foto.');
    return profile;
  } finally { clearTimeout(timeout); }
}
