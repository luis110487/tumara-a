import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { supabase } from '../../lib/supabaseClient';

const LABELS = {
  home_categories_title: 'Título sección "Categorías populares"',
  home_professionals_title: 'Título sección "Profesionales destacados"',
  home_how_it_works_title: 'Título sección "Así de fácil"',
  hero_image_url: 'Imagen principal del inicio',
  hero_image_link: 'Link de la imagen principal (opcional)',
};

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

  async function handleSave(e, key) {
    e.preventDefault();
    const value = e.target.value.value.trim();
    setSavingKey(key);
    setMsg({ text: '', ok: false });
    try {
      await apiFetch(`/api/admin/site-texts/${key}`, { method: 'PATCH', body: JSON.stringify({ value }) });
      setMsg({ text: 'Texto actualizado correctamente.', ok: true });
      load();
    } catch (err) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleSaveLink(e, key) {
    e.preventDefault();
    const value = e.target.value.value.trim();
    setSavingKey(key);
    setMsg({ text: '', ok: false });
    try {
      await apiFetch(`/api/admin/site-texts/${key}`, { method: 'PATCH', body: JSON.stringify({ value }) });
      setMsg({ text: 'Link actualizado correctamente.', ok: true });
      load();
    } catch (err) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setSavingKey(null);
    }
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

  if (loading) return <p className="loading">Cargando…</p>;

  return (
    <div>
      <h2 className="requests-subhead">Textos e imágenes del inicio</h2>
      <p style={{ fontSize: '12px', color: 'var(--tm-muted)', marginBottom: '20px' }}>
        Edita los títulos e imágenes que se muestran en la página de inicio.
      </p>
      {msg.text && <div className={`msg ${msg.ok ? 'ok' : 'error'}`} style={{ marginBottom: '20px' }}>{msg.text}</div>}
      <div className="admin-list">
        {texts.filter(t => t.key !== 'hero_image_link').map(t => t.key === 'hero_image_url' ? (
          <div className="admin-row" key={t.key} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ width: '100%' }}>
              <p style={{ fontWeight: 800, fontSize: '13px', marginBottom: '10px' }}>{LABELS[t.key] || t.key}</p>
              <img src={t.value} alt="Imagen principal" style={{ maxWidth: '260px', maxHeight: '160px', objectFit: 'cover', borderRadius: '10px', marginBottom: '10px', display: 'block' }} />
              <label className="link-btn" style={{ cursor: savingKey === t.key ? 'default' : 'pointer' }}>
                {savingKey === t.key ? 'Subiendo...' : 'Cambiar imagen'}
                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, t.key)} disabled={savingKey === t.key} style={{ display: 'none' }} />
              </label>
            </div>
            {(() => {
              const linkText = texts.find(x => x.key === 'hero_image_link');
              return (
                <form onSubmit={e => handleSaveLink(e, 'hero_image_link')} style={{ width: '100%', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--tm-line)' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 800 }}>
                    {LABELS.hero_image_link}
                    <input name="value" type="url" defaultValue={linkText?.value || ''} maxLength={500} placeholder="https://... (déjalo vacío para que no sea clickeable)" />
                  </label>
                  <button className="btn primary" type="submit" disabled={savingKey === 'hero_image_link'} style={{ marginTop: '10px' }}>
                    {savingKey === 'hero_image_link' ? 'Guardando...' : 'Guardar link'}
                  </button>
                </form>
              );
            })()}
          </div>
        ) : (
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
