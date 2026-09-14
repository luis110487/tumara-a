import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiFetch, AuthRequiredError } from '../lib/apiClient';
import { loginRedirectState } from '../lib/loginRedirect';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, STATUS_OPTIONS } from '../components/StatusBadge';

export function Chat() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewMsg, setReviewMsg] = useState({ text: '', ok: false });
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const accepted = searchParams.get('aceptada') === '1';
  const linkError = searchParams.get('error');
  const channelRef = useRef(null);

  async function loadChat() {
    try {
      const j = await apiFetch(`/api/requests/${id}`);
      setData(j);
    } catch (err) {
      if (err instanceof AuthRequiredError) return navigate('/cuenta', loginRedirectState());
      setMsg(err.message);
    }
  }

  useEffect(() => {
    loadChat();
    channelRef.current = supabase
      .channel('request-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${id}` }, () => loadChat())
      .subscribe();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [id]);

  async function handleSend(e) {
    e.preventDefault();
    if (sending) return;
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setBody('');
    setMsg('');
    try {
      await apiFetch(`/api/requests/${id}/messages`, { method: 'POST', body: JSON.stringify({ body: text }) });
      await loadChat();
    } catch (err) {
      setBody(text);
      setMsg(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleReview(e) {
    e.preventDefault();
    setReviewMsg({ text: '', ok: false });
    try {
      await apiFetch(`/api/requests/${id}/review`, { method: 'POST', body: JSON.stringify({ rating, comment: comment.trim() }) });
      setReviewMsg({ text: '¡Gracias por tu calificación!', ok: true });
      await loadChat();
    } catch (err) {
      setReviewMsg({ text: err.message, ok: false });
    }
  }

  async function handleStatusChange(e) {
    const status = e.target.value;
    try {
      await apiFetch(`/api/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadChat();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <section className="chat-page">
      <Link className="back" to="/">← Volver</Link>
      <div className="chat-layout">
        <div className="chat-panel">
          <div className="chat-head">
            <div>
              <small>CONVERSACIÓN</small>
              <h1>{data ? `${data.service_title} · ${data.professional?.display_name || 'Profesional'}` : 'Cargando…'}</h1>
            </div>
            {data && (
              <div className="chat-status">
                <StatusBadge status={data.status} />
                <select onChange={handleStatusChange} value={data.status}>
                  {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            )}
          </div>
          {(accepted || linkError) && (
            <div className={`msg ${accepted ? 'ok' : 'error'}`} style={{ marginBottom: '12px' }}>
              {accepted ? '¡Solicitud aceptada! Ya puedes coordinar los detalles con el cliente.' : linkError}
              <button type="button" className="link-btn" onClick={() => setSearchParams({}, { replace: true })} style={{ marginLeft: '10px' }}>Cerrar</button>
            </div>
          )}
          <div className="messages">
            {data && (
              <div className="request-card">
                <small>DETALLE DE LA SOLICITUD</small>
                <p className="request-card-title">{data.service_title}</p>
                {data.description && <p>{data.description}</p>}
                <ul>
                  {data.city && <li><b>Ciudad:</b> {data.city}</li>}
                  {data.address && <li><b>Dirección:</b> {data.address}</li>}
                  {data.preferred_date && <li><b>Fecha preferida:</b> {data.preferred_date}</li>}
                </ul>
              </div>
            )}
            {data?.messages?.map(m => (
              <div key={m.id} className={`bubble ${m.sender_id === user?.id ? 'mine' : ''}`}>
                <small>{m.sender_id === user?.id ? 'Tú' : 'Participante'}</small>
                <div>{m.body}</div>
              </div>
            ))}
            {data && data.messages?.length === 0 && (
              <p className="messages-empty">
                Todavía no hay mensajes en esta conversación.
                {data.is_customer ? ' Escribe el primero para coordinar los detalles.' : ' Saluda al cliente para empezar.'}
              </p>
            )}
          </div>
          <form className="composer" onSubmit={handleSend}>
            <input value={body} onChange={e => setBody(e.target.value)} maxLength={3000} placeholder="Escribe un mensaje…" autoComplete="off" required />
            <button type="submit" disabled={sending}>➤</button>
          </form>
          {msg && <div className="msg error">{msg}</div>}
        </div>

        {data && data.status === 'completed' && data.is_customer && (
          <div className="form-card" style={{ marginTop: '20px' }}>
            {data.review ? (
              <>
                <h2 className="requests-subhead">Tu calificación</h2>
                <p style={{ fontSize: '20px', color: '#f0a400' }}>{'★'.repeat(data.review.rating)}{'☆'.repeat(5 - data.review.rating)}</p>
                {data.review.comment && <p style={{ color: 'var(--tm-muted)' }}>{data.review.comment}</p>}
              </>
            ) : (
              <>
                <h2 className="requests-subhead">Califica este servicio</h2>
                <form onSubmit={handleReview}>
                  <label>Calificación
                    <select value={rating} onChange={e => setRating(Number(e.target.value))}>
                      {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n})</option>)}
                    </select>
                  </label>
                  <label>Comentario (opcional)<textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={2000} placeholder="¿Cómo fue tu experiencia?" /></label>
                  <button className="btn primary" type="submit">Enviar calificación</button>
                </form>
                {reviewMsg.text && <div className={`msg ${reviewMsg.ok ? 'ok' : 'error'}`}>{reviewMsg.text}</div>}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
