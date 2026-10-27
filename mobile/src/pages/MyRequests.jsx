import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, AuthRequiredError } from '../lib/apiClient';
import { loginRedirectState } from '../lib/loginRedirect';
import { StatusBadge } from '../components/StatusBadge';
import { AppIcon } from '../components/AppIcon';

const GROUPS = [['all', 'Todas'], ['pending', 'Pendientes'], ['active', 'Activas'], ['finished', 'Finalizadas']];
const STATES = { pending: ['requested', 'in_conversation', 'quoted'], active: ['accepted', 'in_progress'], finished: ['completed', 'cancelled'] };
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function dateLabel(value) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}
export function MyRequests() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const view = params.get('view') === 'professional' ? 'professional' : 'customer';
  const group = GROUPS.some(([key]) => key === params.get('state')) ? params.get('state') : 'all';
  const query = params.get('q') || '';
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    apiFetch('/api/requests/mine').then(result => {
      if (!Array.isArray(result?.as_customer) || !Array.isArray(result?.as_professional)) throw new Error('Invalid requests');
      if (active) setData(result);
    }).catch(error => {
      if (!active) return;
      if (error instanceof AuthRequiredError) { navigate('/cuenta', loginRedirectState()); return; }
      setError('No pudimos cargar tus solicitudes. Revisa tu conexión e inténtalo de nuevo.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [navigate, retry]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setRetry(value => value + 1); };
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  function update(values) {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
    setParams(next, { replace: true });
  }
  const all = data?.[view === 'customer' ? 'as_customer' : 'as_professional'] || [];
  const filtered = all.filter(request => (group === 'all' || STATES[group]?.includes(request.status)) && normalize(`${request.service_title} ${request.city || ''}`).includes(normalize(query.trim())));
  return <section className="my-requests-mobile">
    <header className="my-requests-header"><h1>Mis solicitudes</h1><button type="button" aria-label="Actualizar solicitudes" onClick={() => setRetry(value => value + 1)} disabled={loading}><AppIcon name="refresh" size={22} /></button></header>
    <p className="my-requests-intro">Consulta tus servicios y continúa cada conversación.</p>
    <div className="my-requests-views" role="group" aria-label="Solicitudes como cliente o profesional">{[['customer', 'Como cliente'], ['professional', 'Como profesional']].map(([key, title]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => update({ view: key === 'customer' ? '' : key })}>{title}{data && <span>{data[key === 'customer' ? 'as_customer' : 'as_professional'].length}</span>}</button>)}</div>
    <label className="my-requests-search"><AppIcon name="search" size={21} /><input aria-label="Buscar solicitudes" type="search" value={query} onChange={event => update({ q: event.target.value })} placeholder="Buscar por servicio o ciudad…" maxLength={100} />{query && <button type="button" aria-label="Limpiar búsqueda de solicitudes" onClick={() => update({ q: '' })}>×</button>}</label>
    <div className="my-requests-filters" role="group" aria-label="Filtrar solicitudes por estado">{GROUPS.map(([key, title]) => <button type="button" key={key} aria-pressed={group === key} onClick={() => update({ state: key === 'all' ? '' : key })}>{title}</button>)}</div>
    <p className="my-requests-count" role="status" aria-live="polite">{loading ? 'Cargando solicitudes…' : error ? '' : `${filtered.length} ${filtered.length === 1 ? 'solicitud' : 'solicitudes'}`}</p>
    {loading ? <div className="my-requests-loading" aria-hidden="true">{[1, 2, 3].map(n => <div key={n}><span /><i /><i /></div>)}</div> : error ? <div className="my-requests-empty" role="alert"><AppIcon name="refresh" size={32} /><h2>No pudimos cargar la lista</h2><p>{error}</p><button className="my-requests-primary" onClick={() => setRetry(value => value + 1)}>Reintentar solicitudes</button></div> : filtered.length ? <div className="my-requests-list">{filtered.map(request => <Link key={request.id} className="my-request-card" to={`/solicitud/${request.id}/chat`} state={{ from: location.pathname + location.search }}>
      <div className="my-request-top"><span className="my-request-number">Solicitud #{request.id}</span><StatusBadge status={request.status} /></div>
      <h2>{request.service_title || 'Solicitud de servicio'}</h2>
      <p className="my-request-city"><AppIcon name="pin" size={15} />{request.city || 'Ciudad por confirmar'}</p>
      {dateLabel(request.preferred_date) && <p className="my-request-date">Fecha preferida: {dateLabel(request.preferred_date)}</p>}
      <div className="my-request-footer"><span>{dateLabel(request.updated_at) ? `Actualizada ${dateLabel(request.updated_at)}` : 'Ver detalles de la solicitud'}</span><strong><AppIcon name="chat" size={16} />Abrir chat <span>›</span></strong></div>
    </Link>)}</div> : <div className="my-requests-empty"><AppIcon name="clipboard" size={37} /><h2>{all.length ? 'Sin coincidencias' : view === 'customer' ? 'Tu próximo servicio empieza aquí' : 'Aún no tienes solicitudes recibidas'}</h2><p>{all.length ? 'Prueba otro servicio, ciudad o estado.' : view === 'customer' ? 'Encuentra un profesional y envía tu primera solicitud.' : 'Las solicitudes de tus clientes aparecerán en esta sección.'}</p>{group !== 'all' || query ? <button className="my-requests-primary" onClick={() => update({ q: '', state: '' })}>Limpiar filtros</button> : view === 'customer' ? <Link className="my-requests-primary" to="/">Buscar profesionales</Link> : null}</div>}
  </section>;
}
