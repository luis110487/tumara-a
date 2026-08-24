import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState({ text: '', ok: false });
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const password = e.target.password.value;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setMsg({ text: error.message, ok: false });
    setMsg({ text: 'Contraseña actualizada. Ya puedes iniciar sesión con ella.', ok: true });
    setTimeout(() => navigate('/cuenta'), 1500);
  }

  return (
    <section className="account">
      <div>
        <span className="kicker">RESTABLECER CONTRASEÑA</span>
        <h1>Elige una nueva contraseña</h1>
        <p>Usa el enlace que recibiste por correo para llegar hasta aquí y define tu nueva contraseña.</p>
      </div>
      <div className="form-card">
        {ready ? (
          <form onSubmit={handleSubmit}>
            <label>Nueva contraseña<input type="password" name="password" autoComplete="new-password" required minLength={8} /></label>
            <button className="btn primary" type="submit">Guardar nueva contraseña</button>
          </form>
        ) : (
          <p>Abre esta página desde el enlace de recuperación que te enviamos por correo.</p>
        )}
        {msg.text && <div className={`msg ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</div>}
      </div>
    </section>
  );
}
