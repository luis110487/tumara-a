import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, apiFetchPublic, AuthRequiredError } from '../lib/apiClient';
import { loginRedirectState } from '../lib/loginRedirect';
import { photoError, MAX_PHOTO_BYTES } from '../lib/uploadPhoto';
import { uploadEvidencePhoto } from '../lib/uploadEvidence';
import { CityPicker } from '../components/CityPicker';
import { AppIcon } from '../components/AppIcon';
import { useAuth } from '../context/AuthContext';
import { readSelectedCity } from '../lib/selectedCity';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
function EvidenceField({ number, disabled }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const input = useRef(null);
  useEffect(() => {
    if (!file || (file.type && file.type !== 'application/octet-stream' && !IMAGE_TYPES.includes(file.type)) || file.size > MAX_PHOTO_BYTES) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <div className="pro-signup-evidence"><label>Foto de trabajo {number}<input ref={input} name={`evidence${number}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={event => setFile(event.target.files?.[0] || null)} /></label>{preview && <img src={preview} alt={`Vista previa del trabajo ${number}`} />}{file && <button type="button" disabled={disabled} onClick={() => { input.current.value = ''; setFile(null); }}>Quitar foto {number}</button>}</div>;
}
export function RegisterProfessional() {
  const [categories, setCategories] = useState([]);
  const [catalog, setCatalog] = useState('loading');
  const [retry, setRetry] = useState(0);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const lock = useRef(false);
  const uploaded = useRef(new WeakMap());
  const navigate = useNavigate();
  const { role, profileLoading, refreshProfile } = useAuth();
  useEffect(() => {
    let active = true;
    setCatalog('loading');
    apiFetchPublic('/api/categories').then(data => {
      if (!Array.isArray(data)) throw new Error('Invalid categories');
      if (active) { setCategories(data); setCatalog('ready'); }
    }).catch(() => { if (active) setCatalog('error'); });
    return () => { active = false; };
  }, [retry]);
  async function handleSubmit(event) {
    event.preventDefault();
    if (lock.current || profileLoading || !role || role === 'professional' || role === 'admin' || catalog !== 'ready' || !categories.length) return;
    const fields = new FormData(event.currentTarget);
    const name = String(fields.get('name') || '').trim();
    const description = String(fields.get('description') || '').trim();
    const city = String(fields.get('city') || '').trim();
    const experience = Number(fields.get('experience') || 0);
    const category = String(fields.get('category') || '');
    const whatsapp = String(fields.get('whatsapp') || '').trim().replace(/[\s()+-]/g, '');
    setMsg('');
    if (!name || !description || !city || !categories.some(c => String(c.id) === category)) { setMsg('Completa el nombre, la categoría, el municipio y la descripción.'); return; }
    if (!Number.isInteger(experience) || experience < 0 || experience > 80) { setMsg('La experiencia debe ser un número entero entre 0 y 80.'); return; }
    if (whatsapp && !/^\d{7,15}$/.test(whatsapp)) { setMsg('Escribe el número de WhatsApp con código de país, usando entre 7 y 15 dígitos.'); return; }
    const files = [fields.get('evidence1'), fields.get('evidence2')].map(file => file?.name ? file : null);
    if (files.some(file => file && ((file.type && file.type !== 'application/octet-stream' && !IMAGE_TYPES.includes(file.type)) || file.size > MAX_PHOTO_BYTES))) { setMsg('Cada foto debe ser JPG, PNG o WebP y pesar como máximo 20 MB.'); return; }
    lock.current = true; setSending(true);
    try {
      const urls = await Promise.all(files.map(async file => {
        if (!file) return null;
        if (uploaded.current.has(file)) return uploaded.current.get(file);
        const url = await uploadEvidencePhoto(file); uploaded.current.set(file, url); return url;
      }));
      await apiFetch('/api/professionals', { method: 'POST', body: JSON.stringify({ display_name: name, category_id: category, city,
        neighborhood: String(fields.get('neighborhood') || '').trim(), experience_years: experience, description, whatsapp,
        ...(urls[0] ? { evidence_url_1: urls[0] } : {}), ...(urls[1] ? { evidence_url_2: urls[1] } : {}),
      }) });
      setSuccess(true);
      refreshProfile().catch(() => {});
    } catch (error) {
      if (error instanceof AuthRequiredError) { navigate('/cuenta', loginRedirectState()); return; }
      setMsg(error instanceof TypeError ? 'No pudimos confirmar el envío. Revisa Mi perfil profesional antes de volver a enviarlo.' : photoError(error));
    } finally { lock.current = false; setSending(false); }
  }
  const header = <header className="pro-signup-header"><Link to="/" aria-label="Volver al inicio"><AppIcon name="back" /></Link><span>Registro profesional</span></header>;
  if (profileLoading) return <section className="pro-signup">{header}<p className="pro-signup-state" role="status">Cargando tu cuenta…</p></section>;
  if (success) return <section className="pro-signup">{header}<div className="pro-signup-complete" role="status"><span>✓</span><h1>Perfil enviado para aprobación</h1><p>Tu perfil quedará pendiente de revisión antes de aparecer en las búsquedas.</p><Link className="pro-signup-primary" to="/mi-perfil-profesional">Ver mi perfil profesional</Link><Link className="pro-signup-secondary" to="/">Volver al inicio</Link></div></section>;
  if (role === 'professional' || role === 'admin' || !role) return <section className="pro-signup">{header}<div className="pro-signup-state"><h1>{role === 'professional' ? 'Ya tienes un perfil profesional' : role === 'admin' ? 'Registro no disponible para administradores' : 'No pudimos verificar tu cuenta'}</h1><p>{role === 'professional' ? 'Consulta tus datos y el estado de aprobación desde tu perfil profesional.' : role === 'admin' ? 'Las cuentas de administrador no pueden registrar un perfil profesional.' : 'Vuelve a iniciar sesión para continuar.'}</p><Link className="pro-signup-primary" to={role === 'professional' ? '/mi-perfil-profesional' : role === 'admin' ? '/' : '/cuenta'}>{role === 'professional' ? 'Ir a mi perfil profesional' : role === 'admin' ? 'Volver al inicio' : 'Ir a mi cuenta'}</Link></div></section>;
  return <section className="pro-signup">{header}
    <div className="pro-signup-intro"><span className="pro-signup-icon"><AppIcon name="tools" size={31} /></span><h1>Haz visible tu habilidad</h1><p>Crea tu perfil para que los clientes conozcan tus servicios y puedan contactarte.</p><span className="pro-signup-note">Revisión antes de publicación</span></div>
    <form className="pro-signup-form" onSubmit={handleSubmit}>
      <fieldset disabled={sending}>
        <section className="pro-signup-section"><h2><span>1</span>Tu servicio</h2><label>Nombre comercial o profesional *<input name="name" required maxLength={150} placeholder="¿Cómo te conocen tus clientes?" /></label><label>Categoría *<select name="category" required disabled={catalog !== 'ready' || !categories.length} defaultValue=""><option value="">Selecciona tu especialidad</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          {catalog === 'loading' && <p role="status">Cargando categorías…</p>}{catalog === 'error' && <div className="pro-signup-error" role="alert"><p>No pudimos cargar las categorías.</p><button type="button" onClick={() => setRetry(value => value + 1)}>Reintentar categorías</button></div>}{catalog === 'ready' && !categories.length && <p role="status">Aún no hay categorías disponibles. Intenta más tarde.</p>}
          <label>Años de experiencia<input name="experience" type="number" min="0" max="80" step="1" defaultValue="0" inputMode="numeric" /></label><label>Cuéntanos sobre tu trabajo *<textarea name="description" required rows={5} maxLength={3000} placeholder="Describe tus servicios, experiencia y especialidad…" /></label>
        </section>
        <section className="pro-signup-section"><h2><span>2</span>Ubicación y contacto</h2><CityPicker name="city" value={readSelectedCity()} required /><label>Barrio <small>(opcional)</small><input name="neighborhood" maxLength={100} placeholder="Zona donde prestas el servicio" /></label><label>WhatsApp <small>(opcional)</small><input name="whatsapp" type="tel" maxLength={20} placeholder="Ej. 573001234567" autoComplete="tel" /></label><p>Incluye el código de país para que puedan contactarte.</p></section>
        <section className="pro-signup-section"><h2><span>3</span>Muestra tus trabajos</h2><p>Agrega hasta dos fotos de trabajos realizados. Es opcional. JPG, PNG o WebP, hasta 20 MB por foto.</p><div className="pro-signup-photos"><EvidenceField number={1} disabled={sending} /><EvidenceField number={2} disabled={sending} /></div></section>
      </fieldset>
      {msg && <div className="pro-signup-error" role="alert"><p>{msg}</p><Link to="/mi-perfil-profesional">Consultar mi perfil profesional</Link></div>}
      <button type="submit" className="pro-signup-primary" disabled={sending || catalog !== 'ready' || !categories.length}>{sending ? 'Enviando perfil…' : 'Enviar para aprobación'}</button><Link className="pro-signup-secondary" to="/">Cancelar y volver al inicio</Link><p className="pro-signup-footer">Los campos con * son obligatorios. Tu perfil no se publicará hasta ser aprobado.</p>
    </form>
  </section>;
}
