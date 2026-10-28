import { supabase } from './supabaseClient';
import * as platform from './pushPlatform';
export { platformName } from './pushPlatform';
let owner = null, generation = 0, queue = Promise.resolve(), bindings = Promise.resolve(), pending = null;
const recordKey = 'tm.push.registration';
const enqueue = work => { const result = queue.then(work, work); queue = result.catch(() => {}); return result; };
const bindUser = userId => { const result = bindings.then(() => platform.bindUser(userId)); bindings = result.catch(() => {}); return result; };
function record() { try { return JSON.parse(localStorage.getItem(recordKey) || 'null'); } catch { return null; } }
async function deviceRequest(method, body, session) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api/push/devices', { method, signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body) });
    if (!response.ok) throw Object.assign(new Error('No pudimos registrar las notificaciones.'), { status: response.status });
  } finally { clearTimeout(timer); }
}
export function setPushUser(userId) {
  if (owner === userId) return;
  owner = userId; generation++; pending = null;
  // Remove the local account binding immediately, before registering another account.
  if (!userId || record()?.userId !== userId) bindUser(null).catch(() => {});
}
export async function pushStatus() {
  const state = await platform.status(), saved = record();
  if (!state.configured || !state.supported || !owner) return { ...state, registered: false, backendReady: false };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.id !== owner) return { ...state, registered: false, backendReady: false };
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
  try {
    const params = new URLSearchParams(); if (saved?.userId === owner) params.set('installationId', saved.installationId);
    const response = await fetch(`/api/push/status?${params}`, { signal: controller.signal, headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!response.ok) throw new Error('Push unavailable');
    const remote = await response.json();
    return { ...state, backendReady: remote.ready === true, registered: state.enabled && remote.registered === true };
  } finally { clearTimeout(timer); }
}
export async function enablePush({ interactive = true } = {}) {
  // Request permission while the browser still has the user's click gesture.
  if (interactive) await platform.requestPermission();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || owner !== session.user.id) throw new Error('Inicia sesión para activar los avisos.');
  if (pending?.userId === session.user.id) return pending.promise;
  const version = generation;
  const promise = enqueue(async () => {
    if (version !== generation || owner !== session.user.id) throw new Error('La sesión cambió.');
    const device = await platform.registerDevice();
    if (version !== generation) throw new Error('La sesión cambió.');
    await deviceRequest('POST', device, session);
    if (version !== generation) { await deviceRequest('DELETE', { installationId: device.installationId }, session); throw new Error('La sesión cambió.'); }
    localStorage.setItem(recordKey, JSON.stringify({ installationId: device.installationId, userId: session.user.id }));
    await bindUser(session.user.id);
    if (version !== generation) { await bindUser(null); throw new Error('La sesión cambió.'); }
    window.dispatchEvent(new Event('tm:push-status'));
    return device;
  });
  pending = { userId: session.user.id, promise };
  try { return await promise; } finally { if (pending?.promise === promise) pending = null; }
}
export async function disablePushForLogout() {
  const saved = record();
  const { data: { session } } = await supabase.auth.getSession();
  setPushUser(null);
  await bindUser(null).catch(() => {});
  return enqueue(async () => {
    try { if (saved && session?.user.id === saved.userId) await deviceRequest('DELETE', { installationId: saved.installationId }, session); }
    finally { localStorage.removeItem(recordKey); await platform.unregisterDevice(); }
  });
}
export const consumePushPath = () => owner ? platform.consumePath(owner) : Promise.resolve(null);
export const subscribePush = (onOpen, onToken) => platform.subscribe(onOpen, onToken);
export const openPushSettings = () => platform.openSettings();
