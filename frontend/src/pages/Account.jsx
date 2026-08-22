import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export function Account() {
  const [tab, setTab] = useState('login');
  const [msg, setMsg] = useState({ text: '', ok: false });
  const navigate = useNavigate();

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
    const name = e.target.name.value.trim();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (error) return setMsg({ text: error.message, ok: false });
    setMsg({ text: 'Cuenta creada. Revisa tu correo si la confirmación está activada.', ok: true });
  }

  return (
    <section className="account">
      <div>
        <span className="kicker">TU CUENTA</span>
        <h1>Entra a TuMaraña.com</h1>
        <p>Accede para solicitar servicios, administrar tus solicitudes o registrar tu actividad profesional.</p>
      </div>
      <div className="form-card">
        <div className="tabs">
          <button type="button" className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>Ingresar</button>
          <button type="button" className={tab === 'signup' ? 'active' : ''} onClick={() => setTab('signup')}>Crear cuenta</button>
        </div>
        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <label>Email<input type="email" name="email" autoComplete="email" required /></label>
            <label>Contraseña<input type="password" name="password" autoComplete="current-password" required minLength={8} /></label>
            <button className="btn primary" type="submit">Ingresar</button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <label>Nombre<input name="name" autoComplete="name" required maxLength={150} /></label>
            <label>Email<input type="email" name="email" autoComplete="email" required /></label>
            <label>Contraseña<input type="password" name="password" autoComplete="new-password" required minLength={8} /></label>
            <button className="btn primary" type="submit">Crear cuenta</button>
          </form>
        )}
        {msg.text && <div className={`msg ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</div>}
      </div>
    </section>
  );
}
