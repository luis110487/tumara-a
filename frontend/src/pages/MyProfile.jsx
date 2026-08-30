import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, AuthRequiredError } from '../lib/apiClient';
import { supabase } from '../lib/supabaseClient';
import { CityPicker } from '../components/CityPicker';
import { StatusBadge } from '../components/StatusBadge';

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

export function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState({ text: '', ok: false });
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    apiFetch('/api/me')
      .then(setProfile)
      .catch(err => {
        if (err instanceof AuthRequiredError) return navigate('/cuenta');
      })
      .finally(() => setLoading(false));

    apiFetch('/api/requests/mine')
      .then(d => setRequests(d.as_customer || []))
      .catch(() => setRequests([]));
  }

  async function handleSave(e) {
    e.preventDefault();
    const f = e.target;
    setMsg({ text: '', ok: false });
    try {
      const updated = await apiFetch('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: f.full_name.value.trim(),
          phone: f.phone.value.trim(),
          city: f.city.value.trim(),
          address: f.address.value.trim(),
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
      const updated = await apiFetch('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatar_url: publicData.publicUrl }),
      });
      setProfile(updated);
      setPhotoMsg({ text: 'Foto de perfil actualizada.', ok: true });
    } catch (err) {
      setPhotoMsg({ text: `Error al subir la foto: ${err.message}`, ok: false });
    } finally {
      setUploading(false);
    }
  }

  if (loading || !profile) return <section className="profile"><p className="loading">Cargando…</p></section>;

  const grouped = {
    pendientes: requests.filter(r => ['requested', 'in_conversation', 'quoted'].includes(r.status)),
    activas: requests.filter(r => ['accepted', 'in_progress'].includes(r.status)),
    finalizadas: requests.filter(r => ['completed', 'cancelled'].includes(r.status)),
  };

  return (
    <section className="results">
      <div className="results-head">
        <span className="kicker">MI PERFIL</span>
        <h1>{profile.full_name}</h1>
      </div>

      {!editing ? (
        <div className="profile-body" style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="profile-avatar small">{profile.full_name[0]}</div>
            )}
            <label className="link-btn" style={{ cursor: uploading ? 'default' : 'pointer' }}>
              {uploading ? 'Subiendo...' : 'Cambiar foto'}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} style={{ display: 'none' }} />
            </label>
          </div>
          {photoMsg.text && <div className={`msg ${photoMsg.ok ? 'ok' : 'error'}`} style={{ marginBottom: '14px' }}>{photoMsg.text}</div>}
          <h2>Datos de la cuenta</h2>
          <p><b>Nombre:</b> {profile.full_name}</p>
          <p><b>Teléfono:</b> {profile.phone || 'No especificado'}</p>
          <p><b>Ciudad:</b> {profile.city || 'No especificada'}</p>
          <p><b>Dirección:</b> {profile.address || 'No especificada'}</p>
          <button className="btn primary" type="button" onClick={() => setEditing(true)} style={{ marginTop: '14px' }}>Editar perfil</button>
        </div>
      ) : (
        <div className="form-card" style={{ marginBottom: '30px', maxWidth: '500px' }}>
          <form onSubmit={handleSave}>
            <label>Nombre completo<input name="full_name" defaultValue={profile.full_name} required maxLength={150} /></label>
            <label>Teléfono<input name="phone" defaultValue={profile.phone || ''} maxLength={20} placeholder="opcional" /></label>
            <CityPicker name="city" value={profile.city || ''} />
            <label>Dirección<input name="address" defaultValue={profile.address || ''} maxLength={250} placeholder="opcional" /></label>
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
