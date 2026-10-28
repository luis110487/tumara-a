import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { firebaseConfig, firebaseConfigured } from './lib/firebaseConfig';
import { readPushBinding } from './lib/pushBinding';
import { safePushPath } from './lib/pushRoutes';

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const { path, recipient_id: recipient } = event.notification.data || {};
  if (!safePushPath(path)) return;
  event.waitUntil((async () => {
    const binding = await readPushBinding();
    if (!binding?.userId || binding.userId !== recipient) return;
    const target = new URL(path, self.location.origin).href;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(target); await existing.focus(); }
    else await self.clients.openWindow(target);
  })());
});

if (firebaseConfigured) {
  const messaging = getMessaging(initializeApp(firebaseConfig));
  onBackgroundMessage(messaging, async payload => {
    const data = payload.data || {}, path = safePushPath(data.path);
    const binding = await readPushBinding();
    if (!path || !binding?.userId || binding.userId !== data.recipient_id) return;
    await self.registration.showNotification(data.title || 'TuMaraña', {
      body: data.body || 'Tienes una actualización.', icon: '/favicon-192.png', badge: '/favicon-64.png',
      tag: data.event_id, data: { path, recipient_id: data.recipient_id },
    });
  });
}
