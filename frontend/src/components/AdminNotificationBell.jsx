import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/apiClient';
import { supabase } from '../lib/supabaseClient';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const navigate = useNavigate();
  const ref = useRef(null);

  function loadCount() {
    apiFetch('/api/admin/notifications/unread-count').then(d => setCount(d.count)).catch(() => {});
  }

  function loadItems() {
    apiFetch('/api/admin/notifications').then(setItems).catch(() => {});
  }

  useEffect(() => {
    loadCount();
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, () => loadCount())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) loadItems();
  }

  async function handleItemClick(item) {
    setOpen(false);
    if (!item.is_read) {
      apiFetch(`/api/admin/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => {});
      setCount(c => Math.max(0, c - 1));
    }
    if (item.link) navigate(item.link);
  }

  async function handleMarkAllRead() {
    try {
      await apiFetch('/api/admin/notifications/read-all', { method: 'POST' });
      setItems(items.map(i => ({ ...i, is_read: true })));
      setCount(0);
    } catch {
      // ignore
    }
  }

  return (
    <div className="admin-bell" ref={ref}>
      <button type="button" className="admin-bell-btn" onClick={toggleOpen} aria-label="Notificaciones">
        🔔
        {count > 0 && <span className="admin-bell-badge">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div className="admin-bell-panel">
          <div className="admin-bell-panel-head">
            <b>Notificaciones</b>
            {items.some(i => !i.is_read) && (
              <button type="button" className="link-btn" onClick={handleMarkAllRead}>Marcar todas leídas</button>
            )}
          </div>
          <div className="admin-bell-list">
            {items.length === 0 && <div className="admin-bell-empty">Sin notificaciones</div>}
            {items.map(item => (
              <button type="button" key={item.id} className={`admin-bell-item ${item.is_read ? '' : 'unread'}`} onClick={() => handleItemClick(item)}>
                <span>{item.message}</span>
                <small>{timeAgo(item.created_at)}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
