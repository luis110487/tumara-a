import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';

export function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState({ text: '', ok: false });

  useEffect(() => {
    loadBanners();
  }, []);

  async function loadBanners() {
    try {
      const data = await apiFetch('/api/admin/banners');
      setBanners(data);
    } catch (err) {
      setMsg({ text: `Error: ${err.message}`, ok: false });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const f = e.target;
    const formData = {
      title: f.title.value.trim(),
      image_url: f.image_url.value.trim(),
      link: f.link.value.trim(),
      position: parseInt(f.position.value) || 0,
      is_active: f.is_active.checked,
    };

    try {
      if (editingId) {
        await apiFetch(`/api/admin/banners/${editingId}`, { method: 'PATCH', body: JSON.stringify(formData) });
        setMsg({ text: 'Banner actualizado correctamente', ok: true });
      } else {
        await apiFetch('/api/admin/banners', { method: 'POST', body: JSON.stringify(formData) });
        setMsg({ text: 'Banner creado correctamente', ok: true });
      }
      setEditingId(null);
      f.reset();
      await loadBanners();
    } catch (err) {
      setMsg({ text: `Error: ${err.message}`, ok: false });
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este banner?')) return;
    try {
      await apiFetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
      setMsg({ text: 'Banner eliminado', ok: true });
      await loadBanners();
    } catch (err) {
      setMsg({ text: `Error: ${err.message}`, ok: false });
    }
  }

  if (loading) return <div className="loading">Cargando banners...</div>;

  return (
    <div>
      <h2 className="requests-subhead">Crear / Editar Banner</h2>
      <form onSubmit={handleSubmit} className="admin-edit-form" style={{ maxWidth: '500px', marginBottom: '30px' }}>
        <label>Título (opcional)<input name="title" maxLength={200} /></label>
        <label>URL de imagen *<input name="image_url" required maxLength={500} placeholder="https://..." /></label>
        <label>Link (opcional)<input name="link" maxLength={500} placeholder="https://..." /></label>
        <label>Posición<input name="position" type="number" defaultValue="0" /></label>
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input name="is_active" type="checkbox" defaultChecked style={{ width: 'auto' }} />
          <span>Activo</span>
        </label>
        <button className="btn primary" type="submit">{editingId ? 'Guardar cambios' : 'Crear banner'}</button>
        {editingId && <button className="btn outline" type="button" onClick={() => setEditingId(null)}>Cancelar</button>}
      </form>

      {msg.text && <div className={`msg ${msg.ok ? 'ok' : 'error'}`} style={{ marginBottom: '20px' }}>{msg.text}</div>}

      <h2 className="requests-subhead">Banners actuales</h2>
      {banners.length === 0 ? (
        <div className="empty">No hay banners creados</div>
      ) : (
        <div className="admin-list">
          {banners.map((b) => (
            <div key={b.id} className="admin-row">
              <div style={{ flex: 1 }}>
                <h3>{b.title || 'Sin título'}</h3>
                <p style={{ fontSize: '11px', color: '#8c99a8', marginTop: '4px' }}>
                  URL: <code style={{ fontSize: '10px' }}>{b.image_url.substring(0, 50)}...</code>
                </p>
                <p style={{ fontSize: '11px', color: '#8c99a8' }}>
                  Posición: {b.position} | Estado: {b.is_active ? '✓ Activo' : '✗ Inactivo'}
                </p>
              </div>
              <div className="admin-row-actions">
                <button className="btn outline" type="button" onClick={() => setEditingId(b.id)}>Editar</button>
                <button className="btn outline" type="button" onClick={() => handleDelete(b.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
