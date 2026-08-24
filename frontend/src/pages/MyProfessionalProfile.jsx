import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, apiFetchPublic, AuthRequiredError } from '../lib/apiClient';
import { supabase } from '../lib/supabaseClient';
import { CityPicker } from '../components/CityPicker';
import { StatusBadge, PROFESSIONAL_STATUS_LABELS, PROFESSIONAL_STATUS_CLASSES } from '../components/StatusBadge';

function RequestRow({ r }) {
  return (
    <Link className="request-row" to={`/solicitud/${r.id}/chat`}>
      <div>
        <h3>{r.service_title}</h3>
        <p>{r.city || 'Sin ciudad especificada'}</p>
      </div>
      <StatusBadge status={r.status} />
    </Link>
  );
}

export function MyProfessionalProfile() {
  const [profile, setProfile] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState({ text: '', ok: false });
  const navigate = useNavigate();

  useEffect(() => {
    apiFetchPublic('/api/categories').then(setCategories).catch(() => setCategories([]));
    load();
  }, []);

  function load() {
    setLoading(true);
    apiFetch('/api/professionals/mine')
      .then(p => { setProfile(p); setNotFound(false); })
      .catch(err => {
        if (err instanceof AuthRequiredError) return navigate('/cuenta');
        setNotFound(true);
      })
      .finally(() => setLoading(false));

    apiFetch('/api/requests/mine')
      .then(d => setRequests(d.as_professional || []))
      .catch(() => setRequests([]));
  }

  async function handleSave(e) {
    e.preventDefault();
    const f = e.target;
    setMsg({ text: '', ok: false });
    try {
      const updated = await apiFetch('/api/professionals/mine', {
        method: 'PATCH',
        body: JSON.stringify({
          display_name: f.name.value.trim(),
          category_id: f.category.value,
          city: f.city.value.trim(),
          neighborhood: f.neighborhood.value.trim(),
          experience_years: f.experience.value,
          description: f.description.value.trim(),
          whatsapp: f.whatsapp.value.trim(),
        }),
      });
      setProfile(updated);
      setEditing(false);
      setMsg({ text: 'Perfil actualizado correctamente.', ok: true });
    } catch (err) {
      setMsg({ text: err.message, ok: false });
    }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPhotoMsg({ text: '', ok: false });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('avatars').upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const updated = await apiFetch('/api/professionals/mine', {
        method: 'PATCH',
        body: JSON.stringify({ photo_url: publicData.publicUrl }),
      });
      setProfile(updated);
      setPhotoMsg({ text: 'Foto de perfil actualizada.', ok: true });
    } catch (err) {
      setPhotoMsg({ text: `Error al subir la foto: ${err.message}`, ok: false });
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <section className="profile"><p className="loading">Cargando…</p></section>;

  if (notFound) {
    return (
      <section className="profile">
        <span className="kicker">MI PERFIL PROFESIONAL</span>
        <h1>Aún no tienes un perfil profesional</h1>
        <p>Crea tu perfil para empezar a recibir solicitudes de clientes.</p>
        <Link className="btn primary" to="/registrar">Registrar mi perfil profesional</Link>
      </section>
    );
  }

  const grouped = {
    pendientes: requests.filter(r => ['requested', 'in_conversation', 'quoted'].includes(r.status)),
    activas: requests.filter(r => ['accepted', 'in_progress'].includes(r.status)),
    finalizadas: requests.filter(r => ['completed', 'cancelled'].includes(r.status)),
  };

  if (profile.status === 'approved' && !profile.photo_url) {
    return (
      <section className="profile">
        <span className="kicker">MI PERFIL PROFESIONAL</span>
        <h1>¡Tu perfil fue aprobado!</h1>
        <p>Antes de continuar, sube una foto de perfil. Es obligatoria para que los clientes puedan reconocerte.</p>
        <div className="form-card" style={{ maxWidth: '420px', marginTop: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '10px' }}>Foto de perfil *</label>
          <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
          {uploading && <p style={{ fontSize: '12px', color: '#0755bd', marginTop: '10px' }}>Subiendo...</p>}
          {photoMsg.text && <div className={`msg ${photoMsg.ok ? 'ok' : 'error'}`} style={{ marginTop: '12px' }}>{photoMsg.text}</div>}
        </div>
      </section>
    );
  }

  return (
    <section className="results">
      <div className="results-head">
        <span className="kicker">MI PERFIL PROFESIONAL</span>
        <h1>{profile.display_name}</h1>
        <span className={`status-pill ${PROFESSIONAL_STATUS_CLASSES[profile.status] || ''}`}>
          ● {PROFESSIONAL_STATUS_LABELS[profile.status] || profile.status}
        </span>
      </div>

      {profile.status === 'pending' && (
        <div className="msg" style={{ color: '#a06600', marginBottom: '20px' }}>
          Tu perfil está pendiente de aprobación por un administrador. No aparecerá públicamente hasta ser aprobado.
        </div>
      )}
      {profile.status === 'rejected' && (
        <div className="msg error" style={{ marginBottom: '20px' }}>
          Tu perfil fue rechazado. Puedes editarlo y esperar una nueva revisión.
        </div>
      )}
      {profile.status === 'suspended' && (
        <div className="msg error" style={{ marginBottom: '20px' }}>
          Tu perfil está suspendido. Contacta a soporte para más información.
        </div>
      )}

      {!editing ? (
        <div className="profile-body" style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.display_name} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="profile-avatar small">{profile.display_name[0]}</div>
            )}
            <label className="link-btn" style={{ cursor: uploading ? 'default' : 'pointer' }}>
              {uploading ? 'Subiendo...' : 'Cambiar foto'}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} style={{ display: 'none' }} />
            </label>
          </div>
          {photoMsg.text && <div className={`msg ${photoMsg.ok ? 'ok' : 'error'}`} style={{ marginBottom: '14px' }}>{photoMsg.text}</div>}
          <h2>Datos del perfil</h2>
          <p><b>Categoría:</b> {profile.category}</p>
          <p><b>Ciudad:</b> {profile.city}{profile.neighborhood ? ` · ${profile.neighborhood}` : ''}</p>
          <p><b>WhatsApp:</b> {profile.whatsapp || 'No especificado'}</p>
          <p><b>Años de experiencia:</b> {profile.experience_years}</p>
          <p><b>Descripción:</b> {profile.description}</p>
          <button className="btn primary" type="button" onClick={() => setEditing(true)} style={{ marginTop: '14px' }}>Editar perfil</button>
        </div>
      ) : (
        <div className="form-card" style={{ marginBottom: '30px', maxWidth: '600px' }}>
          <form onSubmit={handleSave}>
            <label>Nombre comercial<input name="name" defaultValue={profile.display_name} required maxLength={150} /></label>
            <label>Categoría
              <select name="category" defaultValue={profile.category_id} required>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <CityPicker name="city" value={profile.city} required />
            <label>Barrio<input name="neighborhood" defaultValue={profile.neighborhood || ''} maxLength={100} /></label>
            <label>WhatsApp (opcional)<input name="whatsapp" defaultValue={profile.whatsapp || ''} placeholder="573001234567" maxLength={20} /></label>
            <label>Años de experiencia<input name="experience" type="number" min="0" max="80" defaultValue={profile.experience_years} /></label>
            <label>Descripción<textarea name="description" rows={6} maxLength={3000} defaultValue={profile.description} required /></label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn primary" type="submit">Guardar cambios</button>
              <button className="btn outline" type="button" onClick={() => setEditing(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
      {msg.text && <div className={`msg ${msg.ok ? 'ok' : 'error'}`} style={{ marginBottom: '20px' }}>{msg.text}</div>}

      <h2 className="requests-subhead">Solicitudes pendientes ({grouped.pendientes.length})</h2>
      <div className="request-list">
        {grouped.pendientes.length ? grouped.pendientes.map(r => <RequestRow r={r} key={r.id} />) : <div className="empty">No tienes solicitudes pendientes.</div>}
      </div>

      <h2 className="requests-subhead">Solicitudes activas ({grouped.activas.length})</h2>
      <div className="request-list">
        {grouped.activas.length ? grouped.activas.map(r => <RequestRow r={r} key={r.id} />) : <div className="empty">No tienes solicitudes activas.</div>}
      </div>

      <h2 className="requests-subhead">Finalizadas ({grouped.finalizadas.length})</h2>
      <div className="request-list">
        {grouped.finalizadas.length ? grouped.finalizadas.map(r => <RequestRow r={r} key={r.id} />) : <div className="empty">No tienes solicitudes finalizadas.</div>}
      </div>
    </section>
  );
}
