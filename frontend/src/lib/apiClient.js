import { supabase } from './supabaseClient';

export class AuthRequiredError extends Error {
  constructor() {
    super('AUTH_REQUIRED');
  }
}

const TIMEOUT_MS = 20000;

// Llama a la API con tiempo límite: una petición nunca queda colgada. Los fallos de red siguen siendo
// TypeError porque varias pantallas dependen de eso para avisar "revisa antes de reintentar" y no duplicar un envío.
async function call(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  let body = {};
  try {
    res = await fetch(path, { ...options, signal: controller.signal });
    try {
      body = await res.json();
    } catch (inner) {
      if (inner?.name === 'AbortError') throw inner;
      // sin cuerpo
    }
  } catch (error) {
    if (error?.name === 'AbortError') throw new TypeError('La conexión tardó demasiado. Inténtalo de nuevo.');
    throw error instanceof TypeError ? new TypeError('No pudimos conectarnos. Revisa tu conexión a internet.') : error;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const error = new Error(body.detail || body.error || 'No fue posible completar la operación');
    error.status = res.status;
    throw error;
  }
  return body;
}

export async function apiFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new AuthRequiredError();
  return call(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });
}

export async function apiFetchPublic(path) {
  return call(path);
}
