import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch, AuthRequiredError } from '../lib/apiClient';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, STATUS_OPTIONS } from '../components/StatusBadge';

export function Chat() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewMsg, setReviewMsg] = useState({ text: '', ok: false });
  const navigate = useNavigate();
  const channelRef = useRef(null);

  async function loadChat() {
    try {
      const j = await apiFetch(`/api/requests/${id}`);
      setData(j);
    } catch (err) {
      if (err instanceof AuthRequiredError) return navigate('/cuenta');
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
    const text = body.trim();
    if (!text) return;
    try {
      await apiFetch(`/api/requests/${id}/messages`, { method: 'POST', body: JSON.stringify({ body: text }) });
      setBody('');
      await loadChat();
    } catch (err) {
      setMsg(err.message);
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
          <div className="messages">
            {data?.messages?.map(m => (
              <div key={m.id} className={`bubble ${m.sender_id === user?.id ? 'mine' : ''}`}>
                <small>{m.sender_id === user?.id ? 'Tú' : 'Participante'}</small>
                <div>{m.body}</div>
              </div>
            ))}
          </div>
          <form className="composer" onSubmit={handleSend}>
            <input value={body} onChange={e => setBody(e.target.value)} maxLength={3000} placeholder="Escribe un mensaje…" autoComplete="off" required />
            <button type="submit">➤</button>
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
