import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';

export function AdminUsers() {
  const [role, setRole] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [promoteMsg, setPromoteMsg] = useState({ text: '', ok: false });

  function load() {
    setLoading(true);
    const qs = role ? `?role=${role}` : '';
    apiFetch(`/api/admin/users${qs}`)
      .then(setUsers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [role]);

  async function handlePromote(e) {
    e.preventDefault();
    const email = e.target.email.value.trim();
    setPromoteMsg({ text: '', ok: false });
    try {
      await apiFetch('/api/admin/users/promote', { method: 'POST', body: JSON.stringify({ email }) });
      setPromoteMsg({ text: `${email} ahora es administrador.`, ok: true });
      e.target.reset();
      load();
    } catch (err) {
      setPromoteMsg({ text: err.message, ok: false });
    }
  }

  return (
    <div>
      <div className="form-card admin-promote-card">
        <form className="admin-promote-form" onSubmit={handlePromote}>
          <label>Promover a admin por email<input name="email" type="email" placeholder="usuario@correo.com" required /></label>
          <button className="btn primary" type="submit">Promover</button>
        </form>
        {promoteMsg.text && <div className={`msg ${promoteMsg.ok ? 'ok' : 'error'}`}>{promoteMsg.text}</div>}
      </div>

      <div className="admin-toolbar">
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="">Todos los roles</option>
          <option value="customer">Clientes</option>
          <option value="professional">Profesionales</option>
          <option value="admin">Administradores</option>
        </select>
      </div>
      {error && <div className="msg error">{error}</div>}
      {loading ? <p className="loading">Cargando…</p> : (
        <div className="admin-list">
          {users.map(u => (
            <article className="admin-row" key={u.id}>
              <div>
                <h3>{u.full_name}</h3>
                <p>{u.phone || 'Sin teléfono'}</p>
              </div>
              <span className={`role-badge ${u.role}`}>{u.role}</span>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
