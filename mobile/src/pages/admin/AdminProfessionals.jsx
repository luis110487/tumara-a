import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { StatusBadge, PROFESSIONAL_STATUS_LABELS, PROFESSIONAL_STATUS_CLASSES } from '../../components/StatusBadge';
import { PROFILE_COLORS, profileColor } from '../../lib/profileColors';

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
  const [colors, setColors] = useState({});
  const [saving, setSaving] = useState(null);

  function load() {
    setLoading(true);
    apiFetch(`/api/admin/professionals?status=${status}`)
      .then(data => {
        setPros(data);
        setColors(current => Object.fromEntries(data.map(p => [p.id, current[p.id] || profileColor(p.profile_color, p.id)])));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [status]);

  async function act(id, action) {
    setError('');
    setSaving(id);
    try {
      await apiFetch(`/api/admin/professionals/${id}/${action}`, { method: 'POST', body: JSON.stringify({ profile_color: colors[id] }) });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  async function saveColor(id) {
    setError(''); setSaving(id);
    try {
      const saved = await apiFetch(`/api/admin/professionals/${id}/color`, { method: 'PATCH', body: JSON.stringify({ profile_color: colors[id] }) });
      setPros(items => items.map(item => item.id === id ? { ...item, profile_color: saved.profile_color } : item));
    } catch (err) { setError(err.message); }
    finally { setSaving(null); }
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
              <fieldset className="admin-profile-palette"><legend>Color del perfil</legend><div role="radiogroup" aria-label={`Color del perfil de ${p.display_name}`}>{PROFILE_COLORS.map(color => <button key={color.value} type="button" role="radio" aria-checked={colors[p.id] === color.value} aria-label={color.label} title={color.label} style={{ '--palette-start': color.start, '--palette-end': color.end }} onClick={() => setColors(current => ({ ...current, [p.id]: color.value }))}><span /></button>)}</div><button type="button" className="btn outline" disabled={saving === p.id || colors[p.id] === p.profile_color} onClick={() => saveColor(p.id)}>{saving === p.id ? 'Guardando…' : 'Guardar color'}</button></fieldset>
              <div className="admin-row-actions">
                {p.status !== 'approved' && <button className="btn primary" disabled={saving === p.id} onClick={() => act(p.id, 'approve')}>Aprobar</button>}
                {p.status !== 'rejected' && <button className="btn outline" disabled={saving === p.id} onClick={() => act(p.id, 'reject')}>Rechazar</button>}
                {p.status !== 'suspended' && <button className="btn outline" disabled={saving === p.id} onClick={() => act(p.id, 'suspend')}>Suspender</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
