import { Capacitor, registerPlugin } from '@capacitor/core';
const native = registerPlugin('DeviceNotifications');
export const platformName = 'android';
export async function status() { return Capacitor.isNativePlatform() ? { ...await native.status(), supported: true } : { configured: false, enabled: false, supported: false }; }
export async function requestPermission() { /* Native register displays the Android permission prompt. */ }
export async function registerDevice() { return { ...await native.register(), platform: platformName }; }
export async function bindUser(userId) { if (Capacitor.isNativePlatform()) await native.bindUser({ userId: userId || '' }); }
export async function unregisterDevice() { if (Capacitor.isNativePlatform()) await native.unregister(); }
export async function consumePath(userId) { return Capacitor.isNativePlatform() ? (await native.consumeLaunch({ userId })).path : null; }
export async function openSettings() { if (Capacitor.isNativePlatform()) await native.openSettings(); }
export async function subscribe(onOpen, onToken) {
  if (!Capacitor.isNativePlatform()) return () => {};
  const opened = () => onOpen();
  window.addEventListener('tm:push-open', opened);
  const listener = await native.addListener('tokenChanged', onToken);
  return () => { window.removeEventListener('tm:push-open', opened); listener.remove(); };
}
