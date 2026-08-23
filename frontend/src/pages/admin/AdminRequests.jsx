import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { StatusBadge, STATUS_OPTIONS } from '../../components/StatusBadge';

export function AdminRequests() {
  const [status, setStatus] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const qs = status ? `?status=${status}` : '';
    apiFetch(`/api/admin/requests${qs}`)
      .then(setRequests)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <div className="admin-toolbar">
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {error && <div className="msg error">{error}</div>}
      {loading ? <p className="loading">Cargando…</p> : (
        <div className="admin-list">
          {requests.length === 0 && <div className="empty">No hay solicitudes.</div>}
          {requests.map(r => (
            <article className="admin-row" key={r.id}>
              <div>
                <h3>{r.service_title}</h3>
                <p>Con {r.professional_name}{r.city ? ` · ${r.city}` : ''}</p>
              </div>
              <StatusBadge status={r.status} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
