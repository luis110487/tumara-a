import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { authFeedback } from '../lib/authFeedback';
export function ResetPassword() {
 const [state,setState]=useState('loading'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false);
 useEffect(()=>{
  let active=true;
  const error=new URLSearchParams(window.location.hash.slice(1)).get('error')||new URLSearchParams(window.location.search).get('error');
  if(error){setState('invalid');setMessage('El enlace no es válido o ha vencido. Solicita uno nuevo.');return;}
  supabase.auth.getSession().then(({data,error})=>{if(active){setState(!error&&data.session?'ready':'invalid');if(error)setMessage(authFeedback(error));}}).catch(()=>{if(active){setState('invalid');setMessage('No pudimos verificar el enlace. Revisa tu conexión y vuelve a abrirlo.');}});
  const {data:listener}=supabase.auth.onAuthStateChange(event=>{if(active&&event==='PASSWORD_RECOVERY')setState('ready');});
  return ()=>{active=false;listener.subscription.unsubscribe();};
 },[]);
 async function submit(event){
  event.preventDefault();if(lock.current)return;
  const fields=new FormData(event.currentTarget),password=String(fields.get('password')||'');
  if(password!==fields.get('confirm')){setMessage('Las contraseñas no coinciden.');return;}
  lock.current=true;setBusy(true);setMessage('');
  try{const {error}=await supabase.auth.updateUser({password});if(error)throw error;setState('done');}
  catch(error){setMessage(authFeedback(error));}finally{lock.current=false;setBusy(false);}
 }
 return <section className="account"><div><h1>Restablecer contraseña</h1><p>Elige una contraseña de al menos 8 caracteres.</p></div><div className="form-card">
 {state==='loading'?<p role="status">Verificando enlace…</p>:state==='ready'?<form onSubmit={submit}><label>Nueva contraseña<input type="password" name="password" autoComplete="new-password" required minLength={8} maxLength={128}/></label><label>Confirmar contraseña<input type="password" name="confirm" autoComplete="new-password" required minLength={8} maxLength={128}/></label><button type="submit" className="btn primary" disabled={busy}>{busy?'Guardando…':'Guardar nueva contraseña'}</button></form>:state==='done'?<p role="status">Contraseña actualizada correctamente.</p>:<p>Abre esta pantalla desde el último enlace de recuperación que recibiste. Los enlaces vencidos o ya utilizados necesitan renovarse.</p>}
 {message&&<p role="alert">{message}</p>}{state==='invalid'&&<Link className="btn primary" to="/cuenta?recover=1">Solicitar otro enlace</Link>}<p><Link to="/">Volver al inicio</Link></p></div></section>;
}
