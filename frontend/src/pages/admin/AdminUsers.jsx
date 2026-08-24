import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';

export function AdminUsers() {
  const [role, setRole] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [promoteMsg, setPromoteMsg] = useState({ text: '', ok: false });
  const [createMsg, setCreateMsg] = useState({ text: '', ok: false });
  const [editingId, setEditingId] = useState(null);
  const [editMsg, setEditMsg] = useState({ text: '', ok: false });
  const [resetResult, setResetResult] = useState(null);

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

  async function handleCreateAdmin(e) {
    e.preventDefault();
    const f = e.target;
    const email = f.email.value.trim();
    setCreateMsg({ text: '', ok: false });
    try {
      await apiFetch('/api/admin/users/create-admin', {
        method: 'POST',
        body: JSON.stringify({ full_name: f.full_name.value.trim(), email, password: f.password.value }),
      });
      setCreateMsg({ text: `Cuenta admin creada para ${email}. Si tu proyecto exige confirmar el correo, esa persona debe hacerlo antes de iniciar sesión.`, ok: true });
      f.reset();
      load();
    } catch (err) {
      setCreateMsg({ text: err.message, ok: false });
    }
  }

  async function toggleActive(u) {
    setError('');
    try {
      await apiFetch(`/api/admin/users/${u.id}/active`, { method: 'PATCH', body: JSON.stringify({ is_active: !u.is_active }) });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleResetPassword(u) {
    if (!confirm(`¿Generar una nueva contraseña para ${u.full_name}? La contraseña actual dejará de funcionar.`)) return;
    setError('');
    try {
      const result = await apiFetch(`/api/admin/users/${u.id}/reset-password`, { method: 'POST' });
      setResetResult({ user: u.full_name, password: result.new_password });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleEditUser(e) {
    e.preventDefault();
    const f = e.target;
    const user = users.find(u => u.id === editingId);
    setEditMsg({ text: '', ok: false });
    try {
      await apiFetch(`/api/admin/users/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: f.full_name.value.trim(),
          phone: f.phone.value.trim(),
          role: f.role.value,
        }),
      });
      setEditMsg({ text: 'Usuario actualizado correctamente', ok: true });
      setEditingId(null);
      load();
    } catch (err) {
      setEditMsg({ text: err.message, ok: false });
    }
  }

  return (
    <div>
      <div className="form-card admin-promote-card">
        <h2 className="requests-subhead">Crear cuenta de administrador</h2>
        <form className="admin-inline-form" onSubmit={handleCreateAdmin}>
          <input name="full_name" placeholder="Nombre completo" required maxLength={150} />
          <input name="email" type="email" placeholder="correo@ejemplo.com" required />
          <input name="password" type="password" placeholder="Contraseña (mín. 8 caracteres)" required minLength={8} />
          <button className="btn primary" type="submit">Crear administrador</button>
        </form>
        {createMsg.text && <div className={`msg ${createMsg.ok ? 'ok' : 'error'}`}>{createMsg.text}</div>}
      </div>

      <div className="form-card admin-promote-card">
        <h2 className="requests-subhead">Promover una cuenta existente a admin</h2>
        <form className="admin-promote-form" onSubmit={handlePromote}>
          <label>Email<input name="email" type="email" placeholder="usuario@correo.com" required /></label>
          <button className="btn primary" type="submit">Promover</button>
        </form>
        {promoteMsg.text && <div className={`msg ${promoteMsg.ok ? 'ok' : 'error'}`}>{promoteMsg.text}</div>}
      </div>

      {resetResult && (
        <div className="form-card admin-promote-card">
          <h2 className="requests-subhead">Nueva contraseña generada</h2>
          <p>Contraseña para <b>{resetResult.user}</b>:</p>
          <p style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '1px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--tm-line)', display: 'inline-block' }}>
            {resetResult.password}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--tm-muted)', marginTop: '8px' }}>Cópiala y compártela con el usuario por un canal seguro (WhatsApp, en persona, etc). No se volverá a mostrar.</p>
          <button className="btn outline" type="button" onClick={() => setResetResult(null)} style={{ marginTop: '10px' }}>Cerrar</button>
        </div>
      )}

      {editingId && (
        <div className="form-card admin-promote-card">
          <h2 className="requests-subhead">Editar usuario</h2>
          <form className="admin-edit-form" onSubmit={handleEditUser}>
            {(() => {
              const user = users.find(u => u.id === editingId);
              return (
                <>
                  <label>Nombre completo<input name="full_name" defaultValue={user?.full_name} required maxLength={150} /></label>
                  <label>Teléfono<input name="phone" defaultValue={user?.phone || ''} maxLength={20} placeholder="opcional" /></label>
                  <label>Rol
                    <select name="role" defaultValue={user?.role}>
                      <option value="customer">Cliente</option>
                      <option value="professional">Profesional</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn primary" type="submit">Guardar cambios</button>
                    <button className="btn outline" type="button" onClick={() => setEditingId(null)}>Cancelar</button>
                  </div>
                </>
              );
            })()}
          </form>
          {editMsg.text && <div className={`msg ${editMsg.ok ? 'ok' : 'error'}`}>{editMsg.text}</div>}
        </div>
      )}

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
              <span className={`status-pill ${u.is_active ? 'tm-status-active' : 'tm-status-cancelled'}`}>
                ● {u.is_active ? 'Activa' : 'Desactivada'}
              </span>
              <div className="admin-row-actions">
                <button className="btn outline" onClick={() => setEditingId(u.id)}>Editar</button>
                <button className="btn outline" onClick={() => handleResetPassword(u)}>Nueva contraseña</button>
                <button className="btn outline" onClick={() => toggleActive(u)}>{u.is_active ? 'Desactivar' : 'Activar'}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
