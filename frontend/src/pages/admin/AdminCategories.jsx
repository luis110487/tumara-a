import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';

export function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

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
    const f = e.target;
    setError('');
    setMsg('');
    try {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: f.name.value.trim(),
          slug: f.slug.value.trim(),
          icon: f.icon.value.trim(),
          description: f.description.value.trim(),
        }),
      });
      f.reset();
      setMsg('Categoría creada.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(c) {
    setError('');
    try {
      await apiFetch(`/api/admin/categories/${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <form className="admin-inline-form" onSubmit={handleCreate}>
        <input name="name" placeholder="Nombre" required maxLength={100} />
        <input name="slug" placeholder="slug-en-minusculas" required maxLength={100} pattern="[a-z0-9-]+" />
        <input name="icon" placeholder="Icono (emoji)" maxLength={50} />
        <input name="description" placeholder="Descripción (opcional)" maxLength={500} />
        <button className="btn primary" type="submit">Crear</button>
      </form>
      {error && <div className="msg error">{error}</div>}
      {msg && <div className="msg ok">{msg}</div>}
      {loading ? <p className="loading">Cargando…</p> : (
        <div className="admin-list">
          {categories.map(c => (
            <article className="admin-row" key={c.id}>
              <div>
                <h3>{c.icon} {c.name}</h3>
                <p>{c.slug}{c.description ? ` · ${c.description}` : ''}</p>
              </div>
              <span className={`status-pill ${c.is_active ? 'tm-status-active' : 'tm-status-cancelled'}`}>
                ● {c.is_active ? 'Activa' : 'Inactiva'}
              </span>
              <div className="admin-row-actions">
                <button className="btn outline" onClick={() => toggle(c)}>{c.is_active ? 'Desactivar' : 'Activar'}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
