import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { pushAvailable, pushStatus, enablePush, consumePushPath, openPushSettings } from '../lib/pushNotifications';
export function PushLifecycle() {
  const { user, profileLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!user || profileLoading || !pushAvailable()) return;
    let alive = true;
    const opened = async () => { try { const path = await consumePushPath(); if (alive && path) navigate(path); } catch {} };
    const synchronize = async () => { if (document.visibilityState !== 'visible') return; try { const status = await pushStatus(); if (alive && status.configured && status.enabled) await enablePush(); } catch {} await opened(); };
    synchronize();
    window.addEventListener('tm:push-open', opened);
    document.addEventListener('visibilitychange', synchronize);
    return () => { alive = false; window.removeEventListener('tm:push-open', opened); document.removeEventListener('visibilitychange', synchronize); };
  }, [user?.id, profileLoading, navigate]);
  return null;
}
export function PushSettings() {
  const [status, setStatus] = useState(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; pushStatus().then(value => { if (active) setStatus(value); }).catch(() => { if (active) setMessage('No pudimos consultar las notificaciones.'); }); return () => { active = false; }; }, []);
  async function activate() {
    if (busy) return; setBusy(true); setMessage('');
    try { await enablePush(); setStatus({ configured: true, enabled: true }); setMessage('Este móvil quedó registrado para recibir avisos.'); }
    catch (error) { setMessage(error?.code === 'PUSH_DENIED' ? 'Permite las notificaciones desde los ajustes del móvil y vuelve a activarlas.' : 'No pudimos activar los avisos. Revisa la conexión y la configuración del servicio.'); }
    finally { setBusy(false); }
  }
  return <div><p>{!status ? 'Comprobando notificaciones…' : status.web ? 'La recepción push se configura en la aplicación Android.' : !status.configured ? 'Las notificaciones push necesitan configurar Firebase en esta APK antes de poder activarse.' : status.enabled ? 'Android permite notificaciones. Pulsa para registrar o actualizar este dispositivo.' : 'Activa los avisos para enterarte de solicitudes, mensajes y cambios de estado.'}</p>{status?.configured && <><button type="button" className="account-primary" disabled={busy} onClick={activate}>{busy ? 'Activando…' : 'Activar notificaciones'}</button><button type="button" className="account-panel-link" onClick={openPushSettings}>Abrir ajustes del móvil</button></>}{message && <p role="status">{message}</p>}</div>;
}
