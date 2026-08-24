import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { supabase } from '../../lib/supabaseClient';

export function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

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

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMsg({ text: '', ok: false });

    try {
      const fileName = `banner-${Date.now()}-${file.name}`;
      const { error, data } = await supabase.storage
        .from('banners')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);

      const imageUrl = publicData.publicUrl;
      document.querySelector('input[name="image_url"]').value = imageUrl;
      setPreview(imageUrl);
      setMsg({ text: 'Imagen subida correctamente', ok: true });
    } catch (err) {
      setMsg({ text: `Error al subir: ${err.message}`, ok: false });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const f = e.target;
    const imageUrl = f.image_url.value.trim();

    if (!imageUrl) {
      setMsg({ text: 'Debes ingresar o subir una imagen', ok: false });
      return;
    }

    const formData = {
      title: f.title.value.trim(),
      image_url: imageUrl,
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
      setPreview(null);
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

  const atLimit = banners.length >= 3 && !editingId;
  const editingBanner = editingId ? banners.find(b => b.id === editingId) : null;

  return (
    <div>
      <h2 className="requests-subhead">Crear / Editar Banner</h2>
      <p style={{ fontSize: '12px', color: 'var(--tm-muted)', marginTop: '-8px', marginBottom: '16px' }}>
        Máximo 3 banners activos ({banners.length}/3 creados).
      </p>
      {atLimit ? (
        <div className="msg error" style={{ marginBottom: '20px' }}>
          Ya tienes 3 banners creados, el máximo permitido. Elimina uno de la lista para poder crear otro.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="admin-edit-form" style={{ maxWidth: '500px', marginBottom: '30px' }} key={editingId || 'new'}>
          <label>Título (opcional)<input name="title" defaultValue={editingBanner?.title || ''} maxLength={200} /></label>

          <div style={{ border: '1px dashed #d6e0e9', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: 800, fontSize: '12px' }}>
              Subir imagen
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ width: '100%' }}
            />
            {uploading && <p style={{ fontSize: '12px', color: '#0755bd', marginTop: '8px' }}>Subiendo...</p>}
          </div>

          <label>O pegar URL de imagen<input name="image_url" defaultValue={editingBanner?.image_url || ''} maxLength={500} placeholder="https://..." /></label>
          {(preview || editingBanner?.image_url) && (
            <div style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', maxHeight: '200px' }}>
              <img src={preview || editingBanner.image_url} alt="Preview" style={{ width: '100%', height: 'auto', maxHeight: '200px', objectFit: 'cover' }} />
            </div>
          )}

          <label>Link (opcional)<input name="link" defaultValue={editingBanner?.link || ''} maxLength={500} placeholder="https://..." /></label>
          <label>Posición<input name="position" type="number" defaultValue={editingBanner?.position ?? 0} /></label>
          <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input name="is_active" type="checkbox" defaultChecked={editingBanner ? editingBanner.is_active : true} style={{ width: 'auto' }} />
            <span>Activo</span>
          </label>
          <button className="btn primary" type="submit" disabled={uploading}>{editingId ? 'Guardar cambios' : 'Crear banner'}</button>
          {editingId && <button className="btn outline" type="button" onClick={() => { setEditingId(null); setPreview(null); }}>Cancelar</button>}
        </form>
      )}

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
                <button className="btn outline" type="button" onClick={() => { setEditingId(b.id); setPreview(null); }}>Editar</button>
                <button className="btn outline" type="button" onClick={() => handleDelete(b.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
