import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { supabase } from '../../lib/supabaseClient';

const LABELS = {
  home_categories_title: 'Título sección "Categorías populares"',
  home_professionals_title: 'Título sección "Profesionales destacados"',
  home_how_it_works_title: 'Título sección "Así de fácil"',
};

const HERO_SLOTS = [
  { urlKey: 'hero_image_url', linkKey: 'hero_image_link', label: 'Imagen 1', required: true },
  { urlKey: 'hero_image_url_2', linkKey: 'hero_image_link_2', label: 'Imagen 2 (opcional)', required: false },
  { urlKey: 'hero_image_url_3', linkKey: 'hero_image_link_3', label: 'Imagen 3 (opcional)', required: false },
];
const HERO_KEYS = HERO_SLOTS.flatMap(s => [s.urlKey, s.linkKey]);

async function uploadSiteAsset(file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `hero-${Date.now()}.${fileExt}`;
  const { error } = await supabase.storage.from('site-assets').upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('site-assets').getPublicUrl(fileName);
  return data.publicUrl;
}

export function AdminTexts() {
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

  async function handleSave(e, key) {
    e.preventDefault();
    await saveKey(key, e.target.value.value.trim(), 'Texto actualizado correctamente.');
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

  const otherTexts = texts.filter(t => !HERO_KEYS.includes(t.key));

  return (
    <div>
      <h2 className="requests-subhead">Imágenes del inicio (slider, hasta 3)</h2>
      <p style={{ fontSize: '12px', color: 'var(--tm-muted)', marginBottom: '20px' }}>
        Estas imágenes rotan automáticamente en la parte superior del inicio. La imagen 1 es obligatoria; las otras dos son opcionales.
      </p>
      {msg.text && <div className={`msg ${msg.ok ? 'ok' : 'error'}`} style={{ marginBottom: '20px' }}>{msg.text}</div>}
      <div className="admin-list" style={{ marginBottom: '30px' }}>
        {HERO_SLOTS.map(slot => {
          const url = valueOf(slot.urlKey);
          return (
            <div className="admin-row" key={slot.urlKey} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ width: '100%' }}>
                <p style={{ fontWeight: 800, fontSize: '13px', marginBottom: '10px' }}>{slot.label}</p>
                {url ? (
                  <img src={url} alt={slot.label} style={{ maxWidth: '260px', maxHeight: '160px', objectFit: 'cover', borderRadius: '10px', marginBottom: '10px', display: 'block' }} />
                ) : (
                  <div className="empty" style={{ maxWidth: '260px', marginBottom: '10px' }}>Sin imagen</div>
                )}
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

      <h2 className="requests-subhead">Textos del inicio</h2>
      <div className="admin-list">
        {otherTexts.map(t => (
          <form className="admin-row" onSubmit={e => handleSave(e, t.key)} key={t.key}>
            <div className="admin-edit-form">
              <label>{LABELS[t.key] || t.key}<input name="value" defaultValue={t.value} maxLength={300} required /></label>
            </div>
            <div className="admin-row-actions">
              <button className="btn primary" type="submit" disabled={savingKey === t.key}>{savingKey === t.key ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
