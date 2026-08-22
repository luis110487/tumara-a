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
  if (!res.ok) throw new Error(body.detail || body.error || 'No fue posible completar la operación');
  return body;
}

export async function apiFetchPublic(path) {
  const res = await fetch(path);
  let body = {};
  try {
    body = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) throw new Error(body.detail || body.error || 'No fue posible completar la operación');
  return body;
}
