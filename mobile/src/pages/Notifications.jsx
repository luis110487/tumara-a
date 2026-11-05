import '../notifications.css';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/apiClient';
import { AppIcon } from '../components/AppIcon';
import { safePushPath } from '../lib/pushRoutes';
import { notifyNotificationCountChanged } from '../components/NotificationBell';

function relativeDate(value) {
  const date = new Date(value), seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (!Number.isFinite(date.getTime())) return '';
  if (seconds < 60) return 'Ahora';
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export function Notifications() {
  const [items, setItems] = useState([]), [state, setState] = useState('loading'), [message, setMessage] = useState('');
  const navigate = useNavigate();
  const load = useCallback(() => { setState('loading'); setMessage(''); apiFetch('/api/notifications').then(data => { setItems(Array.isArray(data) ? data : []); setState('ready'); }).catch(() => { setMessage('No pudimos cargar tus notificaciones.'); setState('error'); }); }, []);
  useEffect(load, [load]);
  async function open(item) {
    if (!item.read_at) {
      setItems(current => current.map(value => value.id === item.id ? { ...value, read_at: new Date().toISOString() } : value));
      notifyNotificationCountChanged();
      apiFetch(`/api/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => {});
    }
    const path = safePushPath(item.path);
    if (path) navigate(path);
  }
  async function readAll() {
    try { await apiFetch('/api/notifications/read-all', { method: 'POST' }); setItems(current => current.map(item => ({ ...item, read_at: item.read_at || new Date().toISOString() }))); notifyNotificationCountChanged(); }
    catch { setMessage('No pudimos marcar las notificaciones.'); }
  }
  const unread = items.filter(item => !item.read_at).length;
  return <section className="notifications-screen">
    <header><Link to="/" aria-label="Volver al inicio"><AppIcon name="back" /></Link><h1>Notificaciones</h1>{unread > 0 ? <button type="button" onClick={readAll}>Marcar leídas</button> : <span />}</header>
    {message && <p className="notifications-message" role="alert">{message}</p>}
    {state === 'loading' ? <div className="notifications-loading" role="status"><span /><span /><span /><b className="home-sr-only">Cargando notificaciones…</b></div> : state === 'error' ? <button className="notifications-retry" onClick={load}>Volver a intentar</button> : items.length ? <div className="notifications-list">{items.map(item => <button type="button" key={item.id} className={item.read_at ? '' : 'is-unread'} onClick={() => open(item)}><i><AppIcon name={item.event_type.includes('review') ? 'star' : item.event_type.includes('message') ? 'chat' : item.event_type.includes('professional') ? 'tools' : 'bell'} size={20} /></i><span><strong>{item.title}</strong><small>{item.body}</small><time dateTime={item.created_at}>{relativeDate(item.created_at)}</time></span>{!item.read_at && <b aria-label="Sin leer" />}</button>)}</div> : <div className="notifications-empty"><AppIcon name="bell" size={42} /><h2>Todo está al día</h2><p>Aquí aparecerán los mensajes, cambios de servicio y solicitudes de evaluación.</p></div>}
  </section>;
}
