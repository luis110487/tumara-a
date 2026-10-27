import { supabase } from './supabaseClient';

export class AuthRequiredError extends Error {
  constructor() {
    super('AUTH_REQUIRED');
  }
}

export async function apiFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new AuthRequiredError();
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });
  let body = {};
  try {
    body = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) {
    const error = new Error(body.detail || body.error || 'No fue posible completar la operación');
    error.status = res.status;
    throw error;
  }
  return body;
}

export async function apiFetchPublic(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let res;
  try { res = await fetch(path, { signal: controller.signal }); }
  finally { clearTimeout(timer); }
  let body = {};
  try {
    body = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) throw new Error(body.detail || body.error || 'No fue posible completar la operación');
  return body;
}
