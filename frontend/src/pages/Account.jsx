import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { apiFetch, apiFetchPublic } from '../lib/apiClient';
import { CityPicker } from '../components/CityPicker';

export function Account() {
  const [tab, setTab] = useState('login');
  const [signupType, setSignupType] = useState('cliente');
  const [categories, setCategories] = useState([]);
  const [msg, setMsg] = useState({ text: '', ok: false });
  const [showRecover, setShowRecover] = useState(false);
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
      setMsg({ text: 'Cuenta creada. Revisa tu correo si la confirmación está activada.', ok: true });
      return;
    }

    if (!data.session) {
      setMsg({
        text: 'Cuenta creada. Confirma tu correo, inicia sesión y completa tu registro profesional desde "Soy profesional" en el menú.',
        ok: true,
      });
      return;
    }

    try {
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
        }),
      });
      setMsg({ text: 'Cuenta creada y perfil profesional enviado para aprobación por un administrador.', ok: true });
      navigate('/');
    } catch (err) {
      setMsg({ text: `Tu cuenta quedó creada, pero no pudimos enviar tu perfil profesional (${err.message}). Puedes completarlo desde "Soy profesional" en el menú.`, ok: false });
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
        {showRecover ? (
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
                    </>
                  )}
                  <button className="btn primary" type="submit">Crear cuenta</button>
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
