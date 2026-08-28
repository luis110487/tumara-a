import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';

const LABELS = {
  home_categories_title: 'Título sección "Categorías populares"',
  home_professionals_title: 'Título sección "Profesionales destacados"',
  home_how_it_works_title: 'Título sección "Así de fácil"',
};

const EXCLUDED_KEYS = ['hero_image_url', 'hero_image_link', 'hero_image_url_2', 'hero_image_link_2', 'hero_image_url_3', 'hero_image_link_3'];

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

  if (loading) return <p className="loading">Cargando…</p>;

  const otherTexts = texts.filter(t => !EXCLUDED_KEYS.includes(t.key));

  return (
    <div>
      <h2 className="requests-subhead">Textos del inicio</h2>
      <p style={{ fontSize: '12px', color: 'var(--tm-muted)', marginBottom: '20px' }}>
        Edita los títulos que se muestran en la página de inicio. La imagen principal (hero) se administra ahora desde la pestaña "Banners".
      </p>
      {msg.text && <div className={`msg ${msg.ok ? 'ok' : 'error'}`} style={{ marginBottom: '20px' }}>{msg.text}</div>}
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
