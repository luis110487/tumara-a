import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { apiFetch, apiFetchPublic } from '../lib/apiClient';
import { uploadEvidencePhoto } from '../lib/uploadEvidence';
import { CityPicker } from '../components/CityPicker';

export function Account() {
  const [tab, setTab] = useState('login');
  const [signupType, setSignupType] = useState('cliente');
  const [categories, setCategories] = useState([]);
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [showRecover, setShowRecover] = useState(false);
  const [done, setDone] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetchPublic('/api/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg({ text: error.message, ok: false });
    navigate('/');
  }

  async function handleSignup(e) {
    e.preventDefault();
    const f = e.target;
    const name = f.name.value.trim();
    const email = f.email.value;
    const password = f.password.value;
    setMsg({ text: '', ok: false });

    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (error) {
      let message = error.message;
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('already registered') || lowerMsg.includes('user already exists') || lowerMsg.includes('duplicate')) {
        message = `El correo "${email}" ya está registrado. Por favor, inicia sesión con este correo o usa otro.`;
      } else if (lowerMsg.includes('rate limit') || lowerMsg.includes('too many')) {
        message = 'Demasiados intentos de registro con este correo. Espera unos minutos e intenta de nuevo.';
      }
      return setMsg({ text: message, ok: false });
    }

    if (signupType === 'cliente') {
      if (!data.session) {
        setMsg({ text: 'Cuenta creada. Inicia sesión para continuar.', ok: true });
        return;
      }
      navigate('/');
      return;
    }

    if (!data.session) {
      setMsg({ text: 'Cuenta creada. Inicia sesión para completar tu registro profesional.', ok: true });
      return;
    }

    try {
      setUploading(true);
      const file1 = f.evidence1.files?.[0];
      const file2 = f.evidence2.files?.[0];
      const [evidence_url_1, evidence_url_2] = await Promise.all([
        file1 ? uploadEvidencePhoto(file1) : null,
        file2 ? uploadEvidencePhoto(file2) : null,
      ]);
      setUploading(false);

      await apiFetch('/api/professionals', {
        method: 'POST',
        body: JSON.stringify({
          display_name: f.pro_name.value.trim() || name,
          category_id: f.category.value,
          city: f.city.value.trim(),
          neighborhood: f.neighborhood.value.trim(),
          experience_years: f.experience.value,
          description: f.description.value.trim(),
          whatsapp: f.whatsapp.value.trim(),
          evidence_url_1,
          evidence_url_2,
        }),
      });
      setDone({
        title: 'Registro enviado',
        text: 'Tu cuenta y perfil profesional fueron creados. Tu perfil está en espera de aprobación por un administrador antes de aparecer públicamente.',
      });
    } catch (err) {
      setUploading(false);
      setMsg({ text: `Tu cuenta quedó creada, pero no pudimos enviar tu perfil profesional (${err.message}).`, ok: false });
    }
  }

  async function handleRecover(e) {
    e.preventDefault();
    const email = e.target.email.value;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer-contrasena`,
    });
    if (error) return setMsg({ text: error.message, ok: false });
    setMsg({ text: 'Si el correo existe, te enviamos un enlace para restablecer la contraseña.', ok: true });
    setShowRecover(false);
  }

  return (
    <section className="account">
      <div>
        <span className="kicker">TU CUENTA</span>
        <h1>Entra a TuMaraña.com</h1>
        <p>Accede para solicitar servicios, administrar tus solicitudes o registrar tu actividad profesional.</p>
      </div>
      <div className="form-card">
        {!isSupabaseConfigured && (
          <div className="msg error">
            El servidor todavía no tiene configurado Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). El login y registro no funcionarán hasta que se configure.
          </div>
        )}
        {done ? (
          <>
            <h2 className="requests-subhead">{done.title}</h2>
            <p style={{ color: 'var(--tm-muted)', lineHeight: 1.6 }}>{done.text}</p>
            <button className="btn primary" type="button" onClick={() => navigate('/')} style={{ marginTop: '16px' }}>Ir al inicio</button>
          </>
        ) : showRecover ? (
          <>
            <h2 className="requests-subhead">Recuperar contraseña</h2>
            <form onSubmit={handleRecover}>
              <label>Email<input type="email" name="email" autoComplete="email" required /></label>
              <button className="btn primary" type="submit">Enviar enlace de recuperación</button>
              <button className="btn outline" type="button" onClick={() => setShowRecover(false)}>Volver a iniciar sesión</button>
            </form>
          </>
        ) : (
          <>
            <div className="tabs">
              <button type="button" className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>Ingresar</button>
              <button type="button" className={tab === 'signup' ? 'active' : ''} onClick={() => setTab('signup')}>Crear cuenta</button>
            </div>
            {tab === 'login' ? (
              <form onSubmit={handleLogin}>
                <label>Email<input type="email" name="email" autoComplete="email" required /></label>
                <label>Contraseña<input type="password" name="password" autoComplete="current-password" required minLength={8} /></label>
                <button className="btn primary" type="submit">Ingresar</button>
                <button className="link-btn" type="button" onClick={() => setShowRecover(true)}>¿Olvidaste tu contraseña?</button>
              </form>
            ) : (
              <>
                <div className="signup-type">
                  <button type="button" className={signupType === 'cliente' ? 'active' : ''} onClick={() => setSignupType('cliente')}>Soy cliente</button>
                  <button type="button" className={signupType === 'profesional' ? 'active' : ''} onClick={() => setSignupType('profesional')}>Soy profesional</button>
                </div>
                <form onSubmit={handleSignup} key={signupType}>
                  <label>Nombre<input name="name" autoComplete="name" required maxLength={150} /></label>
                  <label>Email<input type="email" name="email" autoComplete="email" required /></label>
                  <label>Contraseña<input type="password" name="password" autoComplete="new-password" required minLength={8} /></label>
                  {signupType === 'profesional' && (
                    <>
                      <p className="signup-hint">Datos de tu perfil profesional (quedará pendiente de aprobación por un administrador antes de aparecer públicamente).</p>
                      <label>Nombre comercial (opcional, si es distinto a tu nombre)<input name="pro_name" maxLength={150} /></label>
                      <label>Categoría
                        <select name="category" required>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </label>
                      <CityPicker name="city" required />
                      <label>Barrio<input name="neighborhood" maxLength={100} /></label>
                      <label>WhatsApp (opcional)<input name="whatsapp" placeholder="573001234567" maxLength={20} /></label>
                      <label>Años de experiencia<input name="experience" type="number" min="0" max="80" defaultValue="0" /></label>
                      <label>Descripción<textarea name="description" rows={5} maxLength={3000} required /></label>
                      <p className="signup-hint">Evidencias de trabajo (opcional): sube hasta 2 fotos de trabajos realizados.</p>
                      <label>Foto de evidencia 1<input type="file" name="evidence1" accept="image/*" /></label>
                      <label>Foto de evidencia 2<input type="file" name="evidence2" accept="image/*" /></label>
                    </>
                  )}
                  <button className="btn primary" type="submit" disabled={uploading}>{uploading ? 'Subiendo fotos...' : 'Crear cuenta'}</button>
                </form>
              </>
            )}
          </>
        )}
        {msg.text && <div className={`msg ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</div>}
      </div>
    </section>
  );
}
