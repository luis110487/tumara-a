import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { pushStatus, enablePush, consumePushPath, openPushSettings, subscribePush, setPushUser, platformName } from '../lib/pushNotifications';
import { safePushPath } from '../lib/pushRoutes';

export function PushLifecycle() {
  const { user, profileLoading } = useAuth(), navigate = useNavigate();
  const [prompt, setPrompt] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { setPushUser(user?.id || null); setPrompt(false); }, [user?.id]);
  useEffect(() => {
    if (!user || profileLoading) return;
    let alive = true, stop = () => {}, synchronizing = false;
    const opened = async () => { try { const path = safePushPath(await consumePushPath()); if (alive && path) navigate(path); } catch {} };
    const synchronize = async () => {
      if (!alive || synchronizing || document.visibilityState !== 'visible') return;
      synchronizing = true;
      try {
        const state = await pushStatus();
        if (!alive) return;
        if (state.configured && state.supported && state.backendReady) {
          if (state.enabled) { await enablePush({ interactive: false }); setPrompt(false); await stop(); stop = await subscribePush(opened, synchronize); if (!alive) stop(); }
          else if (!state.denied) { let dismissed = false; try { dismissed = sessionStorage.getItem(`tm.push.prompt:${user.id}`) === 'later'; } catch {} if (!dismissed) setPrompt(true); }
        }
      } catch { /* Settings offers an explicit retry. */ }
      finally { synchronizing = false; }
      await opened();
    };
    synchronize();
    document.addEventListener('visibilitychange', synchronize);
    window.addEventListener('tm:push-status', synchronize);
    return () => { alive = false; stop(); document.removeEventListener('visibilitychange', synchronize); window.removeEventListener('tm:push-status', synchronize); };
  }, [user?.id, profileLoading, navigate]);
  async function activate() {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await enablePush(); setPrompt(false); }
    catch (error) { setMessage(pushError(error)); }
    finally { setBusy(false); }
  }
  if (!prompt || !user) return null;
  return <aside className="push-invite" aria-label="Activar notificaciones"><strong>Entérate de tus solicitudes y mensajes</strong><p>Activa los avisos de TuMaraña para recibir novedades aunque estés en otra pantalla.</p><div><button type="button" disabled={busy} onClick={activate}>{busy ? 'Activando…' : 'Activar avisos'}</button><button type="button" disabled={busy} onClick={() => { try { sessionStorage.setItem(`tm.push.prompt:${user.id}`, 'later'); } catch {} setPrompt(false); }}>Más tarde</button></div>{message && <p role="status">{message}</p>}</aside>;
}
function pushError(error) {
  if (error?.code === 'PUSH_DENIED') return 'No se concedió el permiso. Puedes permitir las notificaciones en los ajustes del móvil o navegador.';
  if (error?.code === 'PUSH_UNSUPPORTED') return 'Este navegador no permite recibir estos avisos. Prueba desde un navegador compatible o la app Android.';
  return 'No pudimos activar los avisos. Revisa la conexión y vuelve a intentarlo.';
}
export function PushSettings() {
  const [state, setState] = useState(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  async function refresh() { try { setState(await pushStatus()); } catch { setMessage('No pudimos consultar los avisos. Vuelve a intentarlo.'); } }
  useEffect(() => { let active = true; pushStatus().then(value => { if (active) setState(value); }).catch(() => { if (active) setMessage('No pudimos consultar los avisos.'); }); return () => { active = false; }; }, []);
  async function activate() {
    if (busy) return; setBusy(true); setMessage('');
    try { await enablePush(); await refresh(); setMessage('Este dispositivo quedó registrado para recibir avisos.'); }
    catch (error) { setMessage(pushError(error)); }
    finally { setBusy(false); }
  }
  return <div className="push-settings"><p>{!state ? 'Comprobando avisos…' : !state.supported ? 'Este dispositivo o navegador no permite recibir estos avisos.' : !state.configured || !state.backendReady ? 'Los avisos todavía no están disponibles. Podrás activarlos cuando termine la configuración del servicio.' : state.registered ? 'Este dispositivo está registrado para recibir solicitudes, mensajes y cambios de estado.' : 'Activa los avisos para enterarte de solicitudes, mensajes y cambios de estado.'}</p>{state?.supported && state.configured && state.backendReady && <button type="button" className="account-primary btn primary" disabled={busy} onClick={activate}>{busy ? 'Activando…' : state.registered ? 'Actualizar registro' : 'Activar notificaciones'}</button>}{platformName === 'android' && state?.configured && <button type="button" className="account-panel-link btn outline" onClick={openPushSettings}>Abrir ajustes del móvil</button>}{platformName === 'web' && state?.denied && <p>En el navegador, abre los permisos de este sitio y permite las notificaciones.</p>}<button type="button" className="account-panel-link btn outline" disabled={busy} onClick={refresh}>Comprobar de nuevo</button>{message && <p role="status">{message}</p>}</div>;
}
