import { PushSettings } from '../components/PushNotifications';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, AuthRequiredError } from '../lib/apiClient';
import { loginRedirectState } from '../lib/loginRedirect';
import { uploadPhoto as storePhoto, savePhotoUrl, photoError, MAX_PHOTO_BYTES } from '../lib/uploadPhoto';
import { useAuth } from '../context/AuthContext';
import { CitySelect } from '../components/CitySelect';
import { AppIcon } from '../components/AppIcon';

const MENU = [['/mis-solicitudes', 'clipboard', 'Mis solicitudes'], ['/favoritos', 'heart', 'Mis favoritos'], ['reviews', 'star', 'Mis reseñas'], ['notifications', 'bell', 'Notificaciones'], ['payments', 'card', 'Métodos de pago'], ['address', 'pin', 'Mi dirección'], ['settings', 'settings', 'Configuración'], ['help', 'help', 'Centro de ayuda']];
export function MyProfile() {
  const { user, signOut, isAdmin, role } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [panel, setPanel] = useState('');
  const [city, setCity] = useState('');
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [requests, setRequests] = useState([]);
  const [requestsState, setRequestsState] = useState('loading');
  const [requestsRetry, setRequestsRetry] = useState(0);
  const saveLock = useRef(false), photoLock = useRef(false), exitLock = useRef(false);
  const panelRef = useRef(null);
  const [photoRetry, setPhotoRetry] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    apiFetch('/api/me').then(data => {
      if (!data?.id) throw new Error('No pudimos cargar tu perfil.');
      if (active) { setProfile(data); setCity(data.city || ''); setPhotoFailed(false); }
    }).catch(error => {
      if (!active) return;
      if (error instanceof AuthRequiredError) { navigate('/cuenta', loginRedirectState()); return; }
      setError('No pudimos cargar tu perfil. Revisa tu conexión e inténtalo de nuevo.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry, navigate]);
  useEffect(() => {
    if (panel !== 'reviews') return;
    let active = true;
    setRequestsState('loading');
    apiFetch('/api/requests/mine').then(data => {
      if (!Array.isArray(data.as_customer)) throw new Error('Invalid requests');
      if (active) { setRequests(data.as_customer.filter(r => r.status === 'completed')); setRequestsState('ready'); }
    }).catch(() => { if (active) setRequestsState('error'); });
    return () => { active = false; };
  }, [panel, requestsRetry]);
  useEffect(() => { if (panel) panelRef.current?.focus(); }, [panel]);
  function openPanel(key) { setPanel(key); setCity(profile.city || ''); setMsg({ text: '', ok: false }); }
  async function save(event) {
    event.preventDefault();
    if (saveLock.current) return;
    const fields = new FormData(event.currentTarget);
    const addressOnly = panel === 'address';
    const fullName = String(fields.get('full_name') || '').trim();
    if (!addressOnly && !fullName) { setMsg({ text: 'Escribe tu nombre completo.', ok: false }); return; }
    saveLock.current = true; setSaving(true); setMsg({ text: '', ok: false });
    try {
      const updated = await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify(addressOnly ? { city, address: String(fields.get('address') || '').trim() } : { full_name: fullName, phone: String(fields.get('phone') || '').trim() }) });
      setProfile(updated); setMsg({ text: 'Cambios guardados correctamente.', ok: true });
    } catch (error) { setMsg({ text: error.message || 'No pudimos guardar los cambios.', ok: false }); }
    finally { saveLock.current = false; setSaving(false); }
  }
  async function uploadPhoto(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file || photoLock.current) return;
    setPhotoRetry(null);
    const types = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    if ((file.type && file.type !== 'application/octet-stream' && !types[file.type]) || file.size > MAX_PHOTO_BYTES) { setMsg({ text: 'Elige una imagen JPG, PNG o WebP de hasta 20 MB.', ok: false }); input.value = ''; return; }
    photoLock.current = true; setUploading(true); setMsg({ text: '', ok: false });
    try {
      const publicUrl = await storePhoto(file, 'avatars');
      const updated = await savePhotoUrl('/api/me', 'avatar_url', publicUrl);
      setProfile(updated); setPhotoFailed(false); setPhotoRetry(null); input.value = ''; setMsg({ text: 'Foto de perfil actualizada.', ok: true });
    } catch (error) { setPhotoRetry(input); setMsg({ text: photoError(error), ok: false }); }
    finally { photoLock.current = false; setUploading(false); }
  }
  async function logout() {
    if (exitLock.current) return;
    exitLock.current = true; setLeaving(true); setMsg({ text: '', ok: false });
    try { const result = await signOut(); if (result?.error) throw result.error; navigate('/', { replace: true }); }
    catch { setMsg({ text: 'No pudimos cerrar la sesión. Inténtalo de nuevo.', ok: false }); }
    finally { exitLock.current = false; setLeaving(false); }
  }
  if (loading) return <section className="account-menu"><p className="account-menu-state" role="status">Cargando tu perfil…</p></section>;
  if (error) return <section className="account-menu"><div className="account-menu-state" role="alert"><h1>Tu perfil no está disponible</h1><p>{error}</p><button className="account-primary" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div></section>;
  const panelTitle = MENU.find(([key]) => key === panel)?.[2];
  return <section className="account-menu">
    <button className="account-identity" type="button" onClick={() => openPanel('settings')} aria-label="Editar mis datos de perfil">
      {profile.avatar_url && !photoFailed ? <img src={profile.avatar_url} alt="" onError={() => setPhotoFailed(true)} /> : <span className="account-avatar"><AppIcon name="user" size={38} /></span>}
      <span><strong>{profile.full_name || 'Usuario'}</strong><small>{user?.email || 'Cuenta de TuMaraña'}</small></span><span className="account-chevron">›</span>
    </button>
    {msg.text && <p className={`account-feedback ${msg.ok ? 'is-success' : ''}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
    {photoRetry && <button type="button" className="account-primary" disabled={uploading || saving} onClick={() => uploadPhoto({ target: photoRetry })}>Reintentar foto</button>}
    <nav className="account-options" aria-label="Opciones de mi perfil">{MENU.map(([key, icon, label]) => key.startsWith('/') ? <Link className="account-option" key={key} to={key}><AppIcon name={icon} size={22} /><span>{label}</span><span className="account-chevron">›</span></Link> : <button className="account-option" type="button" key={key} aria-expanded={panel === key} aria-controls="account-panel" onClick={() => openPanel(key)}><AppIcon name={icon} size={22} /><span>{label}</span><span className="account-chevron">›</span></button>)}
      {(role === 'professional' || isAdmin) && <Link className="account-option" to="/mi-perfil-profesional"><AppIcon name="tools" size={22} /><span>Mi perfil profesional</span><span className="account-chevron">›</span></Link>}
      {isAdmin && <Link className="account-option" to="/admin"><AppIcon name="grid" size={22} /><span>Administración</span><span className="account-chevron">›</span></Link>}
      <button type="button" className="account-option account-logout" onClick={logout} disabled={leaving || saving || uploading}><AppIcon name="logout" size={22} /><span>{leaving ? 'Cerrando sesión…' : 'Cerrar sesión'}</span></button>
    </nav>
    {panel && <section id="account-panel" className="account-panel" ref={panelRef} tabIndex={-1} aria-label={panelTitle}>
      <header><h2>{panelTitle}</h2><button type="button" aria-label="Cerrar panel" disabled={saving || uploading} onClick={() => setPanel('')}>×</button></header>
      {(panel === 'settings' || panel === 'address') && <>
        {panel === 'settings' && <div className="account-photo"><label>{uploading ? 'Subiendo foto…' : 'Cambiar foto'}<input aria-label="Seleccionar foto de perfil" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || saving} onChange={uploadPhoto} /></label><small>JPG, PNG o WebP. Máximo 20 MB. Las fotos grandes se optimizan antes de subirlas.</small></div>}
        <form onSubmit={save}><fieldset disabled={saving || uploading}>{panel === 'settings' ? <><label>Nombre completo<input name="full_name" defaultValue={profile.full_name || ''} required maxLength={150} autoComplete="name" /></label><label>Teléfono <small>(opcional)</small><input name="phone" type="tel" defaultValue={profile.phone || ''} maxLength={20} autoComplete="tel" /></label><p className="account-panel-note">Correo de acceso: {user?.email}</p></> : <><label>Ciudad o municipio<CitySelect value={city} onChange={setCity} placeholder="Selecciona tu ciudad" /></label><label>Dirección <small>(opcional)</small><input name="address" defaultValue={profile.address || ''} maxLength={250} autoComplete="street-address" /></label></>}<div className="account-form-actions"><button className="account-primary" type="submit">{saving ? 'Guardando…' : 'Guardar cambios'}</button></div></fieldset></form>
      </>}
      {panel === 'reviews' && <><p>Abre un servicio completado para consultar tu reseña o dejar una calificación.</p>{requestsState === 'loading' ? <p role="status">Cargando servicios…</p> : requestsState === 'error' ? <div role="alert"><p>No pudimos cargar tus servicios.</p><button className="account-primary" onClick={() => setRequestsRetry(value => value + 1)}>Reintentar servicios</button></div> : requests.length ? <div className="account-review-links">{requests.map(request => <Link key={request.id} to={`/solicitud/${request.id}/chat`}><AppIcon name="star" size={19} /><span>{request.service_title}</span><span>›</span></Link>)}</div> : <p>Aún no tienes servicios completados para calificar.</p>}</>}
      {panel === 'notifications' && <><p>Consulta los cambios de tus solicitudes y los mensajes desde la app.</p><Link className="account-panel-link" to="/mis-solicitudes">Ver solicitudes y conversaciones</Link><PushSettings /></>}
      {panel === 'payments' && <p>La app todavía no permite añadir tarjetas ni administrar métodos de pago.</p>}
      {panel === 'help' && <div className="account-help"><details><summary>¿Cómo solicito un servicio?</summary><p>Busca un profesional, abre su perfil y pulsa “Solicitar servicio”. Describe tu necesidad y envía la solicitud para abrir el chat.</p></details><details><summary>¿Dónde veo mis conversaciones?</summary><p>En Mensajes, abre la solicitud que quieres consultar.</p></details><details><summary>¿Cómo guardo un profesional?</summary><p>Toca el corazón de su tarjeta o “Guardar” en su perfil. Los favoritos se guardan en este dispositivo.</p></details><details><summary>¿Cómo califico un servicio?</summary><p>Cuando la solicitud esté completada, abre su conversación y entra en los detalles para enviar tu calificación.</p></details></div>}
    </section>}
  </section>;
}
