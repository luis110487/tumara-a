import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { IconPicker } from '../../components/IconPicker';
import { CategoryIcon } from '../../components/CategoryIcon';

const EMPTY_FORM = { name: '', slug: '', icon: '', description: '' };

export function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  function load() {
    setLoading(true);
    apiFetch('/api/admin/categories')
      .then(setCategories)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await apiFetch('/api/admin/categories', { method: 'POST', body: JSON.stringify(createForm) });
      setCreateForm(EMPTY_FORM);
      setMsg('Categoría creada.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditForm({ name: c.name, slug: c.slug, icon: c.icon || '', description: c.description || '' });
  }

  async function saveEdit(id) {
    setError('');
    try {
      await apiFetch(`/api/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(editForm) });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(c) {
    setError('');
    try {
      await apiFetch(`/api/admin/categories/${c.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !c.is_active }) });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <form className="admin-inline-form" onSubmit={handleCreate}>
        <input placeholder="Nombre" required maxLength={100} value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
        <input placeholder="slug-en-minusculas" required maxLength={100} pattern="[a-z0-9-]+" value={createForm.slug} onChange={e => setCreateForm({ ...createForm, slug: e.target.value })} />
        <input placeholder="Descripción (opcional)" maxLength={500} value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
        <button className="btn primary" type="submit">Crear</button>
        <div className="icon-picker-field">
          <span className="icon-picker-current">
            {createForm.icon ? <CategoryIcon name={createForm.icon} size={18} /> : null} {createForm.icon ? '' : 'Elige un icono'}
          </span>
          <IconPicker value={createForm.icon} onChange={icon => setCreateForm({ ...createForm, icon })} />
        </div>
      </form>
      {error && <div className="msg error">{error}</div>}
      {msg && <div className="msg ok">{msg}</div>}
      {loading ? <p className="loading">Cargando…</p> : (
        <div className="admin-list">
          {categories.map(c => (
            <article className="admin-row" key={c.id}>
              {editingId === c.id ? (
                <>
                  <div className="admin-edit-form">
                    <input value={editForm.name} maxLength={100} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    <input value={editForm.slug} maxLength={100} pattern="[a-z0-9-]+" onChange={e => setEditForm({ ...editForm, slug: e.target.value })} />
                    <input value={editForm.description} maxLength={500} placeholder="Descripción" onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                    <div className="icon-picker-field">
                      <span className="icon-picker-current">{editForm.icon || 'Elige un icono'}</span>
                      <IconPicker value={editForm.icon} onChange={icon => setEditForm({ ...editForm, icon })} />
                    </div>
                  </div>
                  <div className="admin-row-actions">
                    <button className="btn primary" onClick={() => saveEdit(c.id)}>Guardar</button>
                    <button className="btn outline" onClick={() => setEditingId(null)}>Cancelar</button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3>{c.icon} {c.name}</h3>
                    <p>{c.slug}{c.description ? ` · ${c.description}` : ''}</p>
                  </div>
                  <span className={`status-pill ${c.is_active ? 'tm-status-active' : 'tm-status-cancelled'}`}>
                    ● {c.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                  <div className="admin-row-actions">
                    <button className="btn outline" onClick={() => startEdit(c)}>Editar</button>
                    <button className="btn outline" onClick={() => toggle(c)}>{c.is_active ? 'Desactivar' : 'Activar'}</button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
