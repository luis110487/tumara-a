import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { StatusBadge, PROFESSIONAL_STATUS_LABELS, PROFESSIONAL_STATUS_CLASSES } from '../../components/StatusBadge';

const STATUS_FILTERS = [
  ['pending', 'Pendientes'],
  ['approved', 'Aprobados'],
  ['rejected', 'Rechazados'],
  ['suspended', 'Suspendidos'],
  ['all', 'Todos'],
];

export function AdminProfessionals() {
  const [status, setStatus] = useState('pending');
  const [pros, setPros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    apiFetch(`/api/admin/professionals?status=${status}`)
      .then(setPros)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [status]);

  async function act(id, action) {
    setError('');
    try {
      await apiFetch(`/api/admin/professionals/${id}/${action}`, { method: 'POST' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="admin-toolbar">
        <select value={status} onChange={e => setStatus(e.target.value)}>
          {STATUS_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {error && <div className="msg error">{error}</div>}
      {loading ? <p className="loading">Cargando…</p> : (
        <div className="admin-list">
          {pros.length === 0 && <div className="empty">No hay profesionales en este estado.</div>}
          {pros.map(p => (
            <article className="admin-row" key={p.id}>
              <div>
                <h3>{p.display_name}</h3>
                <p>{p.category} · {p.city}{p.neighborhood ? ` · ${p.neighborhood}` : ''}</p>
              </div>
              <StatusBadge status={p.status} labels={PROFESSIONAL_STATUS_LABELS} classes={PROFESSIONAL_STATUS_CLASSES} />
              <div className="admin-row-actions">
                {p.status !== 'approved' && <button className="btn primary" onClick={() => act(p.id, 'approve')}>Aprobar</button>}
                {p.status !== 'rejected' && <button className="btn outline" onClick={() => act(p.id, 'reject')}>Rechazar</button>}
                {p.status !== 'suspended' && <button className="btn outline" onClick={() => act(p.id, 'suspend')}>Suspender</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
