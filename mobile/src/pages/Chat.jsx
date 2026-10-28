import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiFetch, AuthRequiredError } from '../lib/apiClient';
import { loginRedirectState } from '../lib/loginRedirect';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, STATUS_OPTIONS } from '../components/StatusBadge';
import { AppIcon } from '../components/AppIcon';

function dateLabel(value, timeOnly = false) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return '';
  return date.toLocaleString('es-CO', timeOnly ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' });
}
export function Chat() {
  const { id } = useParams();
  const location = useLocation();
  const backTo = /^\/(?:mis-solicitudes(?:\?|$)|mi-perfil$)/.test(location.state?.from || '') ? location.state.from : '/mis-solicitudes';
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [changing, setChanging] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewMsg, setReviewMsg] = useState({ text: '', ok: false });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const detailsRef = useRef(null);
  const messagesRef = useRef(null);
  const nearBottom = useRef(true);
  const sendLock = useRef(false), reviewLock = useRef(false), statusLock = useRef(false);
  const active = useRef(false), sequence = useRef(0);
  const accepted = searchParams.get('aceptada') === '1';
  const linkError = searchParams.get('error');
  const loadChat = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await apiFetch(`/api/requests/${id}`);
      if (!result?.id) throw new Error('No pudimos abrir esta conversación.');
      if (active.current && sequence.current === request) { setData(result); setMsg(''); }
    } catch (error) {
      if (!active.current || sequence.current !== request) return;
      if (error instanceof AuthRequiredError) { navigate('/cuenta', loginRedirectState()); return; }
      setMsg(error instanceof TypeError ? 'No pudimos actualizar la conversación. Revisa tu conexión.' : error.message);
    } finally { if (active.current && sequence.current === request) setLoading(false); }
  }, [id, navigate]);
  useEffect(() => {
    active.current = true; nearBottom.current = true;
    setData(null); setLoading(true); setBody(''); setMsg(''); setReviewMsg({ text: '', ok: false });
    loadChat();
    const channel = supabase.channel('request-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${id}` }, loadChat).subscribe();
    const refresh = () => { if (document.visibilityState === 'visible') loadChat(); };
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { active.current = false; sequence.current++; supabase.removeChannel(channel); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [id, loadChat]);
  useEffect(() => {
    const container = messagesRef.current;
    if (container && nearBottom.current) container.scrollTop = container.scrollHeight;
  }, [data?.messages?.length]);
  async function handleSend(event) {
    event.preventDefault();
    const text = body.trim();
    if (sendLock.current || !text || !data) return;
    sendLock.current = true; setSending(true); setMsg('');
    try {
      await apiFetch(`/api/requests/${id}/messages`, { method: 'POST', body: JSON.stringify({ body: text }) });
      setBody(''); nearBottom.current = true; await loadChat();
    } catch (error) {
      if (error instanceof AuthRequiredError) { navigate('/cuenta', loginRedirectState()); return; }
      setMsg(error instanceof TypeError ? 'No pudimos confirmar el envío. Actualiza la conversación antes de reintentar.' : error.message);
    } finally { sendLock.current = false; setSending(false); }
  }
  async function handleReview(event) {
    event.preventDefault();
    if (reviewLock.current) return;
    reviewLock.current = true; setReviewing(true); setReviewMsg({ text: '', ok: false });
    try {
      await apiFetch(`/api/requests/${id}/review`, { method: 'POST', body: JSON.stringify({ rating, comment: comment.trim() }) });
      setReviewMsg({ text: '¡Gracias por tu calificación!', ok: true }); await loadChat();
    } catch (error) { setReviewMsg({ text: error.message, ok: false }); }
    finally { reviewLock.current = false; setReviewing(false); }
  }
  async function changeStatus(event) {
    const status = event.target.value;
    if (statusLock.current || status === data.status) return;
    statusLock.current = true; setChanging(true); setMsg('');
    try {
      await apiFetch(`/api/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setData(current => ({ ...current, status })); await loadChat();
    } catch (error) { setMsg(error.message); }
    finally { statusLock.current = false; setChanging(false); }
  }
  const messages = Array.isArray(data?.messages) ? data.messages : [];
  const name = data?.is_customer ? data.professional?.display_name || 'Profesional' : 'Cliente';
  return <section className="mobile-chat">
    <header className="mobile-chat-header"><Link to={backTo} state={backTo === '/mi-perfil' ? { panel: location.state?.returnPanel } : undefined} aria-label={backTo === '/mi-perfil' ? 'Volver a mi perfil' : 'Volver a mis solicitudes'}><AppIcon name="back" /></Link><h1>Mensajes</h1><button type="button" aria-label="Ver detalles de la solicitud" disabled={!data} onClick={() => { detailsRef.current.open = !detailsRef.current.open; }}><AppIcon name="dots" /></button></header>
    {data && <div className="mobile-chat-person"><span className="mobile-chat-avatar">{name[0]}</span><div><strong>{name}</strong><small>{data.service_title}</small></div><button type="button" aria-label="Actualizar conversación" onClick={loadChat}><AppIcon name="refresh" size={21} /></button></div>}
    {(accepted || linkError) && <div className="mobile-chat-notice" role="status"><span>{accepted ? '¡Solicitud aceptada! Ya puedes coordinar los detalles.' : linkError}</span><button onClick={() => { const next = new URLSearchParams(searchParams); next.delete('aceptada'); next.delete('error'); setSearchParams(next, { replace: true }); }}>Cerrar</button></div>}
    {msg && <div className="mobile-chat-error" role="alert"><span>{msg}</span><button type="button" onClick={loadChat}>Actualizar</button></div>}
    {data && <details ref={detailsRef} className="mobile-chat-details"><summary><span>Detalles de la solicitud</span><StatusBadge status={data.status} /></summary><div className="mobile-chat-detail-body"><h2>{data.service_title}</h2><p>{data.description}</p>{data.city && <p><b>Ciudad:</b> {data.city}</p>}{data.address && <p><b>Dirección:</b> {data.address}</p>}{data.preferred_date && <p><b>Fecha preferida:</b> {dateLabel(data.preferred_date)} · {dateLabel(data.preferred_date, true)}</p>}<label>Estado de la solicitud<select value={data.status} disabled={changing} onChange={changeStatus}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Link to={`/profesional/${data.professional_id}`}>Ver perfil del profesional</Link>
      {data.status === 'completed' && data.is_customer && <div className="mobile-chat-review"><h2>{data.review ? 'Tu calificación' : 'Califica este servicio'}</h2>{data.review ? <><span className="mobile-chat-stars">{'★'.repeat(Math.max(0, Math.min(5, Number(data.review.rating) || 0)))}</span><p>{data.review.comment}</p></> : <form onSubmit={handleReview}><label>Calificación<select value={rating} onChange={event => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} estrellas</option>)}</select></label><label>Comentario (opcional)<textarea value={comment} onChange={event => setComment(event.target.value)} rows={3} maxLength={2000} /></label><button type="submit" disabled={reviewing || reviewMsg.ok}>{reviewing ? 'Enviando…' : 'Enviar calificación'}</button></form>}{reviewMsg.text && <p role={reviewMsg.ok ? 'status' : 'alert'}>{reviewMsg.text}</p>}</div>}
    </div></details>}
    <div className="mobile-chat-messages" ref={messagesRef} role="log" aria-label="Conversación" aria-live="polite" onScroll={event => { const el = event.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
      {loading && <p className="mobile-chat-empty" role="status">Cargando conversación…</p>}
      {!loading && data && !messages.length && <div className="mobile-chat-empty"><AppIcon name="chat" size={34} /><h2>Comienza la conversación</h2><p>{data.is_customer ? 'Escribe al profesional para coordinar el servicio.' : 'Saluda al cliente para coordinar los detalles.'}</p></div>}
      {messages.map((message, index) => <div className={`mobile-chat-message-row ${message.sender_id === user?.id ? 'is-mine' : ''}`} key={message.id || index}>{dateLabel(message.created_at) && dateLabel(message.created_at) !== dateLabel(messages[index - 1]?.created_at) && <p className="mobile-chat-day">{dateLabel(message.created_at)}</p>}<div className="mobile-chat-bubble"><span className="mobile-chat-message-body">{message.body}</span>{dateLabel(message.created_at, true) && <time dateTime={message.created_at}>{dateLabel(message.created_at, true)}</time>}</div></div>)}
    </div>
    <form className="mobile-chat-composer" onSubmit={handleSend}><input aria-label="Mensaje" value={body} onChange={event => setBody(event.target.value)} maxLength={3000} placeholder="Escribe un mensaje…" autoComplete="off" disabled={!data || sending} required /><button type="submit" aria-label={sending ? 'Enviando mensaje' : 'Enviar mensaje'} disabled={!data || sending || !body.trim()}><AppIcon name="send" size={25} /></button></form>
  </section>;
}
