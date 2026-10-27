import { cleanPhotoFields } from '../lib/photoSource';
import { WorkPhoto } from '../components/WorkPhoto';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';
import { AppIcon } from '../components/AppIcon';
import { useLocalFavorites } from '../lib/useLocalFavorites';

export function ProfessionalProfile() {
  const { id } = useParams();
  const location = useLocation();
  const backTo =  /^(?:\/(?:\?.*)?|\/(?:buscar|favoritos|mi-perfil-profesional)(?:\?.*)?|\/solicitud\/\d+\/chat)$/.test(location.state?.from || '') ? location.state.from : '/';
  const [p, setP] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(false);
  const [reviewsState, setReviewsState] = useState('loading');
  const [retry, setRetry] = useState(0);
  const [reviewsRetry, setReviewsRetry] = useState(0);
  const [tab, setTab] = useState('info');
  const [notice, setNotice] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);
  const { has, toggle } = useLocalFavorites();
  useEffect(() => {
    let active = true;
    setP(null); setError(false); setPhotoFailed(false); setTab('info'); setNotice('');
    apiFetchPublic(`/api/professionals/${id}`).then(data => {
      if (!data || !data.id || !data.display_name) throw new Error('Invalid profile');
      if (active) setP(cleanPhotoFields(data));
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [id, retry]);
  useEffect(() => {
    let active = true;
    setReviews([]); setReviewsState('loading');
    apiFetchPublic(`/api/professionals/${id}/reviews`).then(data => {
      if (active) { setReviews(Array.isArray(data) ? data : []); setReviewsState('ready'); }
    }).catch(() => { if (active) setReviewsState('error'); });
    return () => { active = false; };
  }, [id, reviewsRetry]);
  const back = <Link className="back pro-back" to={backTo} replace state={{ from: location.state?.resultsFrom || '/' }} aria-label="Volver a la pantalla anterior"><AppIcon name="back" /></Link>;
  if (error) return <section className="pro-screen pro-status">{back}<div role="alert"><h1>No pudimos abrir este perfil</h1><p>Puede que ya no esté disponible. Revisa tu conexión o vuelve a intentarlo.</p><button className="pro-primary" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div></section>;
  if (!p) return <section className="pro-screen pro-status">{back}<div role="status" className="pro-skeleton"><span /><p>Cargando perfil…</p></div></section>;
  const saved = has(p.id);
  const digits = String(p.whatsapp || '').replace(/\D/g, '');
  const contact = /^\d{7,15}$/.test(digits) ? digits : '';
  const evidence = [p.evidence_url_1, p.evidence_url_2].map((url, index) => ({ url, number: index + 1 })).filter(photo => photo.url);
  function save() { setNotice(toggle(p) ? '' : 'No pudimos guardar el cambio en este dispositivo.'); }
  const tabs = [['info', 'Información'], ['services', 'Servicios'], ['reviews', 'Reseñas'], ['gallery', 'Galería']];
  return <section className="pro-screen">
    <div className="pro-hero">
      {p.photo_url && !photoFailed ? <img className="pro-portrait" src={p.photo_url} alt={p.display_name} onError={() => setPhotoFailed(true)} /> : <div className="pro-photo-placeholder"><AppIcon name="user" size={90} /><span>Profesional de TuMaraña</span></div>}
      {back}
      {p.verified && <span className="pro-verified">✓ Verificado</span>}
    </div>
    <div className="pro-summary">
      <div className="pro-title"><h1>{p.display_name}</h1><button type="button" className="pro-save-icon" aria-label={`${saved ? 'Quitar de' : 'Guardar en'} favoritos a ${p.display_name}`} aria-pressed={saved} onClick={save}><AppIcon name="heart" filled={saved} /></button></div>
      <p className="pro-specialty">{p.category || 'Profesional de servicios'}</p>
      <p className="pro-rating"><span>★ {Number(p.rating || 0).toFixed(1)}</span> <span>({p.total_reviews || 0} reseñas)</span></p>
      <p className="pro-location"><AppIcon name="pin" size={16} />{[p.city, p.neighborhood].filter(Boolean).join(' · ') || 'Ubicación por confirmar'}</p>
      <div className="pro-actions">
        {contact ? <a href={`tel:+${contact}`}><AppIcon name="phone" /><span>Llamar</span></a> : <button disabled aria-label="Llamar: teléfono no disponible"><AppIcon name="phone" /><span>Llamar</span></button>}
        {contact ? <a className="pro-whatsapp" href={`https://wa.me/${contact}?text=${encodeURIComponent(`Hola ${p.display_name}, te contacto desde TuMaraña.com`)}`} target="_blank" rel="noopener noreferrer"><AppIcon name="chat" /><span>WhatsApp</span></a> : <button disabled aria-label="WhatsApp no disponible"><AppIcon name="chat" /><span>WhatsApp</span></button>}
        <button type="button" aria-expanded={notice === 'Para conversar con este profesional, envía primero una solicitud de servicio.'} onClick={() => setNotice('Para conversar con este profesional, envía primero una solicitud de servicio.')}><AppIcon name="chat" /><span>Mensajear</span></button>
        <button type="button" aria-pressed={saved} onClick={save}><AppIcon name="bookmark" filled={saved} /><span>{saved ? 'Guardado' : 'Guardar'}</span></button>
      </div>
      {notice && <p className="pro-notice" role="status">{notice}</p>}
    </div>
    <div className="pro-tabs" role="tablist" aria-label="Detalles del profesional">{tabs.map(([key, label]) => <button key={key} id={`pro-tab-${key}`} type="button" role="tab" aria-selected={tab === key} aria-controls={`pro-panel-${key}`} tabIndex={tab === key ? 0 : -1} onClick={() => setTab(key)} onKeyDown={event => {
      const index = tabs.findIndex(([value]) => value === tab);
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); setTab(tabs[next][0]); document.getElementById(`pro-tab-${tabs[next][0]}`)?.focus(); }
    }}>{label}</button>)}</div>
    <div id={`pro-panel-${tab}`} className="pro-content" role="tabpanel" aria-labelledby={`pro-tab-${tab}`} tabIndex={0}>
      {tab === 'info' && <><h2>Sobre mí</h2><p>{p.description || 'Este profesional aún no ha añadido una descripción.'}</p>{p.experience_years != null && <div className="pro-experience"><AppIcon name="tools" size={22} /><span><strong>{p.experience_years} {Number(p.experience_years) === 1 ? 'año' : 'años'}</strong> de experiencia</span></div>}</>}
      {tab === 'services' && <><h2>Servicios</h2><div className="pro-service"><AppIcon name="tools" /><div><strong>{p.category || 'Servicios profesionales'}</strong><p>Describe el trabajo que necesitas al solicitar el servicio. El profesional confirmará el alcance y la disponibilidad.</p></div></div></>}
      {tab === 'reviews' && <><h2>Reseñas de clientes</h2>{reviewsState === 'loading' ? <p role="status">Cargando reseñas…</p> : reviewsState === 'error' ? <div role="alert"><p>No pudimos cargar las reseñas.</p><button className="pro-secondary" onClick={() => setReviewsRetry(value => value + 1)}>Reintentar reseñas</button></div> : reviews.length ? <div className="pro-reviews">{reviews.map((review, index) => { const rating = Math.max(0, Math.min(5, Math.round(Number(review.rating) || 0))); return <article key={review.id || index}><span className="pro-review-stars" aria-label={`${rating} de 5 estrellas`}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span><p>{review.comment || 'Este cliente dejó una calificación sin comentario.'}</p></article>; })}</div> : <p>Aún no hay reseñas publicadas para este profesional.</p>}</>}
      {tab === 'gallery' && <><h2>Trabajos realizados</h2>{evidence.length ? <div className="pro-gallery">{evidence.map(({ url, number }) => <WorkPhoto key={url} url={url} number={number} />)}</div> : <p>Este profesional aún no ha publicado fotos de sus trabajos.</p>}</>}
    </div>
    <div className="pro-request-bar"><Link className="pro-primary" to={`/solicitar/${p.id}`}><AppIcon name="chat" size={20} />Solicitar servicio</Link></div>
  </section>;
}
