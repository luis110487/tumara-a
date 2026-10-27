import { cleanPhotoFields } from '../lib/photoSource';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, apiFetchPublic, AuthRequiredError } from '../lib/apiClient';
import { loginRedirectState } from '../lib/loginRedirect';
import { uploadPhoto as storePhoto, savePhotoUrl, photoError, MAX_PHOTO_BYTES } from '../lib/uploadPhoto';
import { CityPicker } from '../components/CityPicker';
import { AppIcon } from '../components/AppIcon';
import { StatusBadge, PROFESSIONAL_STATUS_LABELS, PROFESSIONAL_STATUS_CLASSES } from '../components/StatusBadge';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export function MyProfessionalProfile() {
  const [profile, setProfile] = useState(null);
  const [state, setState] = useState('loading');
  const [retry, setRetry] = useState(0);
  const [categories, setCategories] = useState([]);
  const [catalog, setCatalog] = useState('loading');
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [requests, setRequests] = useState([]);
  const [requestsState, setRequestsState] = useState('loading');
  const [requestsRetry, setRequestsRetry] = useState(0);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [photoFailed, setPhotoFailed] = useState(false);
  const lock = useRef(false);
  const [photoRetry, setPhotoRetry] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true; setState('loading');
    apiFetch('/api/professionals/mine').then(data => {
      if (!data?.id) throw new Error('Invalid profile');
      if (active) { setProfile(cleanPhotoFields(data)); setPhotoFailed(false); setState('ready'); }
    }).catch(error => {
      if (!active) return;
      if (error instanceof AuthRequiredError) { navigate('/cuenta', loginRedirectState()); return; }
      setState(error.status === 404 ? 'missing' : 'error');
    });
    return () => { active = false; };
  }, [retry, navigate]);
  useEffect(() => {
    let active = true; setCatalog('loading');
    apiFetchPublic('/api/categories').then(data => {
      if (!Array.isArray(data)) throw new Error('Invalid categories');
      if (active) { setCategories(data); setCatalog('ready'); }
    }).catch(() => { if (active) setCatalog('error'); });
    return () => { active = false; };
  }, [catalogRetry]);
  useEffect(() => {
    let active = true; setRequestsState('loading');
    apiFetch('/api/requests/mine').then(data => {
      if (!Array.isArray(data?.as_professional)) throw new Error('Invalid requests');
      if (active) { setRequests(data.as_professional); setRequestsState('ready'); }
    }).catch(() => { if (active) setRequestsState('error'); });
    return () => { active = false; };
  }, [requestsRetry]);
  async function save(event) {
    event.preventDefault(); if (lock.current) return;
    const fields = new FormData(event.currentTarget);
    const payload = { display_name: String(fields.get('name') || '').trim(), category_id: fields.get('category'), city: String(fields.get('city') || '').trim(), neighborhood: String(fields.get('neighborhood') || '').trim(), experience_years: Number(fields.get('experience') || 0), description: String(fields.get('description') || '').trim(), whatsapp: String(fields.get('whatsapp') || '').trim().replace(/[\s()+-]/g, '') };
    if (!payload.display_name || !payload.description || !payload.city || !categories.some(c => String(c.id) === payload.category_id)) { setMsg({ text: 'Completa el nombre, la categoría, el municipio y la descripción.', ok: false }); return; }
    if (!Number.isInteger(payload.experience_years) || payload.experience_years < 0 || payload.experience_years > 80) { setMsg({ text: 'La experiencia debe ser un número entero entre 0 y 80.', ok: false }); return; }
    if (payload.whatsapp && !/^\d{7,15}$/.test(payload.whatsapp)) { setMsg({ text: 'WhatsApp debe incluir el código de país y entre 7 y 15 dígitos.', ok: false }); return; }
    lock.current = true; setBusy('save'); setMsg({ text: '', ok: false });
    try { const updated = await apiFetch('/api/professionals/mine', { method: 'PATCH', body: JSON.stringify(payload) }); setProfile(cleanPhotoFields(updated)); setEditing(false); setMsg({ text: 'Perfil actualizado correctamente.', ok: true }); }
    catch (error) { handleError(error); }
    finally { lock.current = false; setBusy(''); }
  }
  function handleError(error) {
    if (error instanceof AuthRequiredError) { navigate('/cuenta', loginRedirectState()); return; }
    setMsg({ text: error.message || 'No pudimos guardar el cambio.', ok: false });
  }
  async function upload(field, event) {
    const input = event.target, file = input.files?.[0];
    if (!file || lock.current) return;
    setPhotoRetry(null);
    if ((file.type && file.type !== 'application/octet-stream' && !TYPES[file.type]) || file.size > MAX_PHOTO_BYTES) { setMsg({ text: 'Elige una imagen JPG, PNG o WebP de hasta 20 MB.', ok: false }); input.value = ''; return; }
    lock.current = true; setBusy(field); setMsg({ text: '', ok: false });
    try {
      const url = await storePhoto(file, field === 'photo_url' ? 'avatars' : 'evidence');
      const updated = await savePhotoUrl('/api/professionals/mine', field, url);
      setProfile(cleanPhotoFields(updated)); if (field === 'photo_url') setPhotoFailed(false);
      setMsg({ text: field === 'photo_url' ? 'Foto de perfil actualizada.' : 'Evidencia actualizada.', ok: true });
      setPhotoRetry(null); input.value = '';
    } catch (error) { setPhotoRetry({ field, input }); setMsg({ text: photoError(error), ok: false }); }
    finally { lock.current = false; setBusy(''); }
  }
  const header = <header className="own-pro-header"><Link to="/mi-perfil" aria-label="Volver a mi cuenta"><AppIcon name="back" /></Link><h1>Mi perfil profesional</h1><button type="button" aria-label="Actualizar perfil profesional" disabled={!!busy || editing || state === 'loading'} onClick={() => { setRetry(value => value + 1); setRequestsRetry(value => value + 1); }}><AppIcon name="refresh" size={21} /></button></header>;
  if (state !== 'ready') return <section className="own-pro">{header}<div className="own-pro-state" role={state === 'error' ? 'alert' : 'status'}>{state === 'loading' ? <p>Cargando perfil profesional…</p> : state === 'missing' ? <><h2>Aún no tienes un perfil profesional</h2><p>Registra tus servicios para empezar.</p><Link className="own-pro-primary" to="/registrar">Registrar mi perfil profesional</Link></> : <><h2>No pudimos cargar tu perfil</h2><p>Revisa tu conexión e inténtalo de nuevo.</p><button className="own-pro-primary" onClick={() => setRetry(value => value + 1)}>Reintentar perfil</button></>}</div></section>;
  const needsPhoto = profile.status === 'approved' && !profile.photo_url;
  const notices = { pending: 'Tu perfil está pendiente de aprobación. No aparecerá públicamente hasta ser aprobado.', rejected: 'Tu perfil fue rechazado. Puedes editar sus datos; la aprobación depende de una revisión administrativa.', suspended: 'Tu perfil está suspendido. Revisa su estado antes de ofrecer nuevos servicios.' };
  return <section className="own-pro">{header}
    <div className="own-pro-summary"><div className="own-pro-identity">{profile.photo_url && !photoFailed ? <img src={profile.photo_url} alt="" onError={() => setPhotoFailed(true)} /> : <span><AppIcon name="user" size={37} /></span>}<div><h2>{profile.display_name}</h2><p>{profile.category || 'Profesional de servicios'}</p><StatusBadge status={profile.status} labels={PROFESSIONAL_STATUS_LABELS} classes={PROFESSIONAL_STATUS_CLASSES} /></div></div><p className="own-pro-city"><AppIcon name="pin" size={16} />{[profile.city, profile.neighborhood].filter(Boolean).join(' · ') || 'Ciudad por confirmar'}</p></div>
    {notices[profile.status] && <p className="own-pro-notice" role="status">{notices[profile.status]}</p>}
    {needsPhoto && <p className="own-pro-notice" role="status"><strong>¡Tu perfil fue aprobado!</strong> Sube una foto de perfil para continuar. Es obligatoria para que los clientes puedan reconocerte.</p>}
    {msg.text && <p className={`own-pro-feedback ${msg.ok ? 'is-success' : ''}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
    {photoRetry && <button type="button" className="own-pro-secondary" disabled={!!busy} onClick={() => upload(photoRetry.field, { target: photoRetry.input })}>Reintentar foto</button>}
    {!editing && <section className="own-pro-card"><h2>{needsPhoto ? 'Añade tu foto de perfil' : 'Foto de perfil'}</h2><label className="own-pro-upload">{busy === 'photo_url' ? 'Subiendo foto…' : profile.photo_url ? 'Cambiar foto' : 'Seleccionar foto'}<input aria-label="Foto de perfil profesional" type="file" accept="image/jpeg,image/png,image/webp" disabled={!!busy} onChange={event => upload('photo_url', event)} /></label><p className="own-pro-hint">JPG, PNG o WebP. Hasta 20 MB. Las fotos grandes se optimizan antes de subirlas.</p></section>}
    {!needsPhoto && <>
      {editing ? <section className="own-pro-card"><h2>Editar mis servicios</h2><form className="own-pro-form" onSubmit={save}><fieldset disabled={!!busy}><label>Nombre comercial *<input name="name" defaultValue={profile.display_name} required maxLength={150} /></label><label>Categoría *<select name="category" defaultValue={profile.category_id} required disabled={catalog !== 'ready' || !categories.length}><option value="">Selecciona una categoría</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{catalog !== 'ready' || !categories.length ? <div role={catalog === 'error' ? 'alert' : 'status'}><p>{catalog === 'loading' ? 'Cargando categorías…' : catalog === 'error' ? 'No pudimos cargar las categorías.' : 'Aún no hay categorías disponibles.'}</p>{catalog === 'error' && <button type="button" className="own-pro-secondary" onClick={() => setCatalogRetry(value => value + 1)}>Reintentar categorías</button>}</div> : null}<CityPicker value={profile.city} required /><label>Barrio<input name="neighborhood" defaultValue={profile.neighborhood || ''} maxLength={100} /></label><label>WhatsApp<input name="whatsapp" type="tel" defaultValue={profile.whatsapp || ''} maxLength={20} /></label><label>Años de experiencia<input name="experience" type="number" min="0" max="80" step="1" defaultValue={profile.experience_years || 0} /></label><label>Descripción *<textarea name="description" rows={5} defaultValue={profile.description || ''} required maxLength={3000} /></label><button className="own-pro-primary" type="submit" disabled={catalog !== 'ready' || !categories.length}>{busy === 'save' ? 'Guardando…' : 'Guardar cambios'}</button><button className="own-pro-secondary" type="button" onClick={() => { setEditing(false); setMsg({ text: '', ok: false }); }}>Cancelar edición</button></fieldset></form></section> : <>
        <section className="own-pro-card"><h2>Mis servicios</h2><p className="own-pro-description">{profile.description || 'Aún no has añadido una descripción.'}</p><div className="own-pro-facts"><span><strong>{profile.experience_years || 0}</strong> años de experiencia</span><span><strong>★ {Number(profile.rating || 0).toFixed(1)}</strong> ({profile.total_reviews || 0} reseñas)</span></div><p className="own-pro-hint">WhatsApp: {profile.whatsapp || 'No especificado'}</p><button className="own-pro-primary" disabled={!!busy} onClick={() => { setEditing(true); setMsg({ text: '', ok: false }); }}>Editar perfil profesional</button>{profile.status === 'approved' && <Link className="own-pro-public" to={`/profesional/${profile.id}`} state={{ from: '/mi-perfil-profesional' }}>Ver mi perfil público ›</Link>}</section>
        <section className="own-pro-card"><h2>Evidencias de trabajo</h2><p className="own-pro-hint">Hasta dos fotos de trabajos realizados. JPG, PNG o WebP; hasta 20 MB por foto.</p><div className="own-pro-evidence">{[1, 2].map(slot => { const field = `evidence_url_${slot}`; return <div key={slot}>{profile[field] ? <a href={profile[field]} target="_blank" rel="noopener noreferrer"><img src={profile[field]} alt={`Trabajo realizado ${slot}`} /></a> : <span className="own-pro-no-photo"><AppIcon name="tools" size={28} />Trabajo {slot}</span>}<label>{busy === field ? 'Subiendo…' : profile[field] ? 'Cambiar evidencia' : 'Agregar evidencia'}<input aria-label={`Evidencia de trabajo ${slot}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={!!busy} onChange={event => upload(field, event)} /></label></div>; })}</div></section>
      </>}
      <section className="own-pro-card"><h2>Solicitudes de clientes</h2>{requestsState === 'loading' ? <p role="status">Cargando solicitudes…</p> : requestsState === 'error' ? <div role="alert"><p>No pudimos cargar tus solicitudes.</p><button className="own-pro-secondary" onClick={() => setRequestsRetry(value => value + 1)}>Reintentar solicitudes</button></div> : <div className="own-pro-request-stats">{[['pending', 'Pendientes', ['requested', 'in_conversation', 'quoted']], ['active', 'Activas', ['accepted', 'in_progress']], ['finished', 'Finalizadas', ['completed', 'cancelled']]].map(([key, label, statuses]) => <Link key={key} to={`/mis-solicitudes?view=professional&state=${key}`}><strong>{requests.filter(request => statuses.includes(request.status)).length}</strong><span>{label}</span></Link>)}</div>}<Link className="own-pro-public" to="/mis-solicitudes?view=professional">Ver todas las solicitudes ›</Link></section>
    </>}
  </section>;
}
