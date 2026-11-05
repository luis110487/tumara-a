import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/apiClient';
import { supabase } from '../lib/supabaseClient';
import { AppIcon } from './AppIcon';
import '../notification-badges.css';

const COUNT_EVENT = 'tm:notifications-changed';

export function notifyNotificationCountChanged() {
  window.dispatchEvent(new CustomEvent(COUNT_EVENT));
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const load = useCallback(() => {
    if (!user) { setCount(0); return; }
    apiFetch('/api/notifications/unread-count')
      .then(data => setCount(Math.max(0, Number(data?.count) || 0)))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return undefined;
    const channel = supabase.channel(`user-notifications-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications', filter: `recipient_id=eq.${user.id}` }, load)
      .subscribe();
    window.addEventListener('focus', load);
    window.addEventListener(COUNT_EVENT, load);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', load);
      window.removeEventListener(COUNT_EVENT, load);
    };
  }, [load, user]);
  return count;
}

export function NotificationBell({ className = '', state }) {
  const count = useUnreadNotificationCount();
  return <Link to="/notificaciones" state={state} className={className} aria-label={count ? `Ver notificaciones, ${count} sin leer` : 'Ver notificaciones'}>
    <AppIcon name="bell" />
    {count > 0 && <span className="notification-count-badge" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
  </Link>;
}
