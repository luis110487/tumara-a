import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { supabase } from '../../lib/supabaseClient';

const HERO_SLOTS = [
  { urlKey: 'hero_image_url', linkKey: 'hero_image_link', label: 'Imagen 1', required: true },
  { urlKey: 'hero_image_url_2', linkKey: 'hero_image_link_2', label: 'Imagen 2 (opcional)', required: false },
  { urlKey: 'hero_image_url_3', linkKey: 'hero_image_link_3', label: 'Imagen 3 (opcional)', required: false },
];

async function uploadSiteAsset(file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `hero-${Date.now()}.${fileExt}`;
  const { error } = await supabase.storage.from('site-assets').upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('site-assets').getPublicUrl(fileName);
  return data.publicUrl;
}

function HeroSliderAdmin() {
  const [texts, setTexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [savingKey, setSavingKey] = useState(null);

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    apiFetch('/api/admin/site-texts')
      .then(setTexts)
      .catch(err => setMsg({ text: err.message, ok: false }))
      .finally(() => setLoading(false));
  }

  function valueOf(key) {
    return texts.find(t => t.key === key)?.value || '';
  }

  async function saveKey(key, value, successText) {
    setSavingKey(key);
    setMsg({ text: '', ok: false });
    try {
      await apiFetch(`/api/admin/site-texts/${key}`, { method: 'PATCH', body: JSON.stringify({ value }) });
      setMsg({ text: successText, ok: true });
      load();
    } catch (err) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleSaveLink(e, key) {
    e.preventDefault();
    await saveKey(key, e.target.value.value.trim(), 'Link actualizado correctamente.');
  }

  async function handleImageUpload(e, key) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingKey(key);
    setMsg({ text: '', ok: false });
    try {
      const url = await uploadSiteAsset(file);
      await apiFetch(`/api/admin/site-texts/${key}`, { method: 'PATCH', body: JSON.stringify({ value: url }) });
      setMsg({ text: 'Imagen actualizada correctamente.', ok: true });
      load();
    } catch (err) {
      setMsg({ text: `Error al subir la imagen: ${err.message}`, ok: false });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleRemoveImage(urlKey, linkKey) {
    await saveKey(urlKey, '', 'Imagen eliminada.');
    if (valueOf(linkKey)) await saveKey(linkKey, '', 'Link eliminado.');
  }

  if (loading) return <p className="loading">Cargando…</p>;

  return (
    <div>
      <h2 className="requests-subhead">Imagen principal del inicio (hero, hasta 3)</h2>
      <p style={{ fontSize: '12px', color: 'var(--tm-muted)', marginBottom: '20px' }}>
        Estas imágenes rotan automáticamente en la parte superior del inicio. La imagen 1 es obligatoria; las otras dos son opcionales.
      </p>
      {msg.text && <div className={`msg ${msg.ok ? 'ok' : 'error'}`} style={{ marginBottom: '20px' }}>{msg.text}</div>}
      <div className="admin-list" style={{ marginBottom: '40px' }}>
        {HERO_SLOTS.map(slot => {
          const url = valueOf(slot.urlKey);
          return (
            <div className="admin-row" key={slot.urlKey} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ width: '100%' }}>
                <p style={{ fontWeight: 800, fontSize: '13px', marginBottom: '10px' }}>{slot.label}</p>
                {url ? (
                  <img src={url} alt={slot.label} style={{ width: '100%', maxWidth: '360px', aspectRatio: '1240 / 440', objectFit: 'contain', background: '#f8fafc', borderRadius: '10px', marginBottom: '10px', display: 'block' }} />
                ) : (
                  <div className="empty" style={{ maxWidth: '360px', marginBottom: '10px' }}>Sin imagen</div>
                )}
                <p style={{ fontSize: '10px', color: 'var(--tm-muted)', marginTop: '-4px', marginBottom: '10px' }}>Vista previa a escala real del hero (la imagen se ajusta completa, sin recortar).</p>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <label className="link-btn" style={{ cursor: savingKey === slot.urlKey ? 'default' : 'pointer' }}>
                    {savingKey === slot.urlKey ? 'Subiendo...' : url ? 'Cambiar imagen' : 'Subir imagen'}
                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, slot.urlKey)} disabled={savingKey === slot.urlKey} style={{ display: 'none' }} />
                  </label>
                  {url && !slot.required && (
                    <button type="button" className="link-btn" onClick={() => handleRemoveImage(slot.urlKey, slot.linkKey)} disabled={savingKey === slot.urlKey}>
                      Quitar imagen
                    </button>
                  )}
                </div>
              </div>
              <form onSubmit={e => handleSaveLink(e, slot.linkKey)} style={{ width: '100%', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--tm-line)' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 800 }}>
                  Link de esta imagen (opcional)
                  <input name="value" type="url" defaultValue={valueOf(slot.linkKey)} maxLength={500} placeholder="https://... (déjalo vacío para que no sea clickeable)" />
                </label>
                <button className="btn primary" type="submit" disabled={savingKey === slot.linkKey} style={{ marginTop: '10px' }}>
                  {savingKey === slot.linkKey ? 'Guardando...' : 'Guardar link'}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
      <HeroSliderAdmin />

      <h2 className="requests-subhead">Crear / Editar Banner publicitario</h2>
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
            <div style={{ marginBottom: '4px', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
              <img src={preview || editingBanner.image_url} alt="Preview" style={{ width: '100%', aspectRatio: '1300 / 420', objectFit: 'contain', display: 'block' }} />
            </div>
          )}
          {(preview || editingBanner?.image_url) && (
            <p style={{ fontSize: '10px', color: 'var(--tm-muted)', marginTop: '0', marginBottom: '12px' }}>Vista previa a escala real del banner (la imagen se ajusta completa, sin recortar).</p>
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
