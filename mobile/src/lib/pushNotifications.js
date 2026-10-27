import { Capacitor, registerPlugin } from '@capacitor/core';
import { apiFetch } from './apiClient';
const native = registerPlugin('DeviceNotifications');
let registered = null;
export function pushAvailable() { return Capacitor.isNativePlatform(); }
export async function pushStatus() { return pushAvailable() ? native.status() : { configured: false, enabled: false, web: true }; }
export async function enablePush() {
  const device = await native.register();
  await apiFetch('/api/push/devices', { method: 'POST', body: JSON.stringify(device) });
  registered = device;
  window.dispatchEvent(new Event('tm:push-status'));
  return device;
}
export async function disablePushForLogout() {
  if (!pushAvailable()) return;
  const previous = registered;
  registered = null;
  try { if (previous) await apiFetch('/api/push/devices', { method: 'DELETE', body: JSON.stringify({ installationId: previous.installationId }) }); } finally { await native.unregister().catch(() => {}); }
}
export async function consumePushPath() { return pushAvailable() ? (await native.consumeLaunch()).path : null; }
export async function openPushSettings() { if (pushAvailable()) await native.openSettings(); }
