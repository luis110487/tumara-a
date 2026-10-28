import { Capacitor, registerPlugin } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { apiFetch } from '../lib/apiClient';
import { AuthShell, FieldIcon } from '../components/AuthShell';
import { authFeedback, safeAuthDestination } from '../lib/authFeedback';

const DeviceInputMode = registerPlugin('DeviceInputMode');
const PROFESSIONAL_INTENT = 'tm.pending-professional';
function professionalIntent(value) {
  try {
    if (value === undefined) return localStorage.getItem(PROFESSIONAL_INTENT) === 'yes';
    if (value) localStorage.setItem(PROFESSIONAL_INTENT, 'yes');
    else localStorage.removeItem(PROFESSIONAL_INTENT);
  } catch { /* Registration still works when storage is unavailable. */ }
  return false;
}

function CredentialsField({ label, name, password = false, signup = false }) {
  const [visible, setVisible] = useState(false);
  return <div>
    <label htmlFor={`auth-${name}`}>{label}</label>
    <div className="auth-input-wrap">
      <FieldIcon kind={password ? 'lock' : 'mail'} />
      <input id={`auth-${name}`} name={name} type={password ? (visible ? 'text' : 'password') : 'email'}
        required minLength={password && signup ? 8 : undefined} maxLength={password ? 128 : 254}
        autoComplete={password ? (signup ? 'new-password' : 'current-password') : (signup ? 'email' : 'username')}
        autoCapitalize="none" spellCheck={false} placeholder={password ? 'Tu contraseña' : 'tu@correo.com'} />
      {password && <button className="auth-password-toggle" type="button" onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}>
        <FieldIcon kind={visible ? 'hidden' : 'eye'} />
      </button>}
    </div>
  </div>;
}

export function Account() {
  const [tab, setTab] = useState('login');
  const [role, setRole] = useState('cliente');
  const [recover, setRecover] = useState(new URLSearchParams(window.location.search).get('recover') === '1');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const submitting = useRef(false);
  const recoveryAfter = useRef(0);
  const messageRef = useRef(null);
  const mounted = useRef(true);
  const navigate = useNavigate();
  const location = useLocation();
  const destination = safeAuthDestination(location.state?.from);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    DeviceInputMode.setMode({ mode: 'pan' }).catch(() => {});
    return () => { DeviceInputMode.setMode({ mode: 'resize' }).catch(() => {}); };
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { if (msg) messageRef.current?.focus(); }, [msg]);

  function switchTab(next) {
    if (submitting.current) return;
    setTab(next); setRecover(false); setMsg(null);
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || !isSupabaseConfigured) return;
    if (recover && Date.now() < recoveryAfter.current) { setMsg({ text: 'Espera un minuto antes de solicitar otro enlace.', ok: false }); return; }
    const form = new FormData(event.currentTarget);
    if (!recover && tab === 'signup' && form.get('password') !== form.get('confirm')) {
      setMsg({ text: 'Las contraseñas no coinciden. Revisa la confirmación.', ok: false });
      return;
    }
    if (!recover && tab === 'signup' && !String(form.get('name') || '').trim()) {
      setMsg({ text: 'Escribe tu nombre para crear la cuenta.', ok: false });
      return;
    }
    submitting.current = true; setBusy(true); setMsg(null);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    try {
      if (recover) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://tumara-a.vercel.app/restablecer-contrasena',
        });
        if (error && error.code !== 'user_not_found') throw error;
        recoveryAfter.current = Date.now() + 60000;
        if (mounted.current) setMsg({ ok: true, text: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
      } else if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!mounted.current) return;
        const finishProfessional = professionalIntent() && destination === '/';
        if (finishProfessional) professionalIntent(false);
        navigate(finishProfessional ? '/registrar' : destination, { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: {
          data: { full_name: String(form.get('name') || '').trim() },
        } });
        if (error) throw error;
        if (!mounted.current) return;
        professionalIntent(role === 'profesional');
        if (!data.session) {
          setMsg({ ok: true, text: role === 'profesional'
            ? 'Revisa tu correo y confirma tu cuenta si recibes un enlace. Luego inicia sesión aquí para completar tu perfil profesional.'
            : 'Revisa tu correo y confirma tu cuenta si recibes un enlace. Luego inicia sesión aquí para continuar.' });
          setTab('login');
        } else {
          apiFetch('/api/welcome-email', { method: 'POST' }).catch(() => {});
          if (role === 'profesional') professionalIntent(false);
          navigate(role === 'profesional' ? '/registrar' : destination, { replace: true });
        }
      }
    } catch (error) {
      if (mounted.current) setMsg({ text: authFeedback(error), ok: false });
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <AuthShell onExit={() => professionalIntent(false)} footer={recover
    ? <button type="button" className="auth-link" disabled={busy} onClick={() => switchTab('login')}>Volver a iniciar sesión</button>
    : <><span>{tab === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}</span>
      <button type="button" className="auth-link" disabled={busy} onClick={() => switchTab(tab === 'login' ? 'signup' : 'login')}>
        {tab === 'login' ? 'Regístrate' : 'Inicia sesión'}
      </button></>}>
    {recover ? <><h1>Recupera tu contraseña</h1><p className="auth-intro">Escribe el correo de tu cuenta. Te enviaremos un enlace para crear una nueva contraseña.</p></>
      : <div className="auth-tabs" role="tablist" aria-label="Acceso a tu cuenta">
        {[['login', 'Iniciar sesión'], ['signup', 'Registrarse']].map(([value, label]) =>
          <button key={value} id={`tab-${value}`} type="button" role="tab" aria-selected={tab === value}
            aria-controls="auth-panel" tabIndex={tab === value ? 0 : -1} disabled={busy}
            onClick={() => switchTab(value)} onKeyDown={event => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next = event.key === 'Home' ? 'login' : event.key === 'End' ? 'signup' : tab === 'login' ? 'signup' : 'login';
                switchTab(next); document.getElementById(`tab-${next}`)?.focus();
              }
            }}>{label}</button>)}
      </div>}
    {!isSupabaseConfigured && <p className="auth-config" role="alert">El acceso no está disponible en esta versión. Inténtalo más tarde.</p>}
    {msg && <div ref={messageRef} tabIndex={-1} role={msg.ok ? 'status' : 'alert'} className={`auth-message${msg.ok ? ' success' : ''}`}>{msg.text}</div>}
    <div id="auth-panel" role={recover ? undefined : 'tabpanel'} aria-labelledby={recover ? undefined : `tab-${tab}`}>
      <form className="auth-form" key={`${tab}-${recover}`} onSubmit={submit} aria-busy={busy}>
        {!recover && tab === 'signup' && <>
          <div className="auth-role" role="group" aria-label="Tipo de cuenta">
            {['cliente', 'profesional'].map(value => <button key={value} type="button" disabled={busy}
              aria-pressed={role === value} onClick={() => setRole(value)}>Soy {value}</button>)}
          </div>
          <div><label htmlFor="auth-name">Nombre completo</label><div className="auth-input-wrap">
            <input id="auth-name" name="name" autoComplete="name" required maxLength={150} placeholder="Tu nombre" />
          </div></div>
        </>}
        <CredentialsField label="Correo electrónico" name="email" signup={tab === 'signup'} />
        {!recover && <CredentialsField label="Contraseña" name="password" password signup={tab === 'signup'} />}
        {!recover && tab === 'signup' && <>
          <CredentialsField label="Confirmar contraseña" name="confirm" password signup />
          <p className="auth-hint">Usa al menos 8 caracteres.{role === 'profesional' ? ' Después completarás los datos de tu perfil profesional.' : ''}</p>
        </>}
        {!recover && tab === 'login' && <button className="auth-link auth-forgot" type="button" disabled={busy}
          onClick={() => { setRecover(true); setMsg(null); }}>¿Olvidaste tu contraseña?</button>}
        <button className="auth-submit" type="submit" disabled={busy || !isSupabaseConfigured}>
          {busy && <span className="auth-spinner" aria-hidden="true" />}
          {busy ? 'Procesando…' : recover ? 'Enviar enlace' : tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  </AuthShell>;
}
