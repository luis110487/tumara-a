import { firebaseConfig, firebaseConfigured, vapidKey } from './firebaseConfig';
import { writePushBinding, readPushBinding } from './pushBinding';
import { safePushPath } from './pushRoutes';

export const platformName = 'web';
let services;
const supported = () => typeof window !== 'undefined' && window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
export async function status() {
  return { configured: firebaseConfigured, supported: supported(), enabled: supported() && Notification.permission === 'granted', denied: supported() && Notification.permission === 'denied' };
}
export async function requestPermission() {
  if (!firebaseConfigured || !supported()) throw Object.assign(new Error('Push unavailable'), { code: 'PUSH_NOT_CONFIGURED' });
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') throw Object.assign(new Error('Permission denied'), { code: 'PUSH_DENIED' });
}
async function sdk() {
  if (!services) services = (async () => {
    const [{ initializeApp, getApps }, messaging] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
    if (!await messaging.isSupported()) throw Object.assign(new Error('Unsupported browser'), { code: 'PUSH_UNSUPPORTED' });
    const app = getApps().find(app => app.name === 'tumarana-push') || initializeApp(firebaseConfig, 'tumarana-push');
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { type: 'module', scope: '/' });
    if (!registration.active) await new Promise((resolve, reject) => {
      const worker = registration.installing || registration.waiting;
      if (!worker) { reject(new Error('Service worker unavailable')); return; }
      const timer = setTimeout(() => { worker.removeEventListener('statechange', changed); reject(new Error('Service worker timeout')); }, 15000);
      const changed = () => { if (worker.state === 'activated') { clearTimeout(timer); worker.removeEventListener('statechange', changed); resolve(); } else if (worker.state === 'redundant') { clearTimeout(timer); reject(new Error('Service worker rejected')); } };
      worker.addEventListener('statechange', changed); changed();
    });
    return { ...messaging, messaging: messaging.getMessaging(app), registration };
  })().catch(error => { services = undefined; throw error; });
  return services;
}
export async function registerDevice() {
  await requestPermission();
  const service = await sdk();
  let installationId = localStorage.getItem('tm.push.web-installation');
  if (!installationId) { installationId = crypto.randomUUID(); localStorage.setItem('tm.push.web-installation', installationId); }
  const token = await service.getToken(service.messaging, { vapidKey, serviceWorkerRegistration: service.registration });
  if (!token) throw new Error('No push token');
  return { token, installationId, platform: platformName };
}
export async function bindUser(userId) { await writePushBinding({ userId }); }
export async function unregisterDevice() {
  if (!supported()) return;
  await writePushBinding(null);
  const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
  if (registration) (await registration.getNotifications()).forEach(notification => notification.close());
  if (firebaseConfigured && Notification.permission === 'granted' && registration) { const service = await sdk(); await service.deleteToken(service.messaging); }
}
export async function subscribe(onOpen, onToken) {
  if (!firebaseConfigured || !supported() || Notification.permission !== 'granted') return () => {};
  const service = await sdk();
  const stop = service.onMessage(service.messaging, async payload => {
    const data = payload.data || {}, binding = await readPushBinding();
    if (!safePushPath(data.path) || !binding?.userId || binding.userId !== data.recipient_id) return;
    await service.registration.showNotification(data.title || 'TuMaraña', { body: data.body || 'Tienes una actualización.', icon: '/favicon-192.png', tag: data.event_id, data });
  });
  return stop;
}
export async function consumePath() { return null; }
export async function openSettings() { /* Browsers require the user to use the site's permission controls. */ }
