import '../service-catalog.css';
import { ProfessionalServices } from '../components/ProfessionalServices';
import '../profile-refresh.css';
import { ProfileModal } from '../components/ProfileModal';
import { cleanPhotoFields } from '../lib/photoSource';
import { PhotoViewer } from '../components/PhotoViewer';
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
  const [viewer, setViewer] = useState(null);
  const [notice, setNotice] = useState('');
  const [panel, setPanel] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);
  const { has, toggle } = useLocalFavorites();
  useEffect(() => {
    let active = true;
    setViewer(null); setP(null); setError(false); setPhotoFailed(false); setTab('info'); setNotice(''); setPanel('');
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
  const requestTo = `/solicitar/${p.id}`;
  const digits = String(p.whatsapp || '').replace(/\D/g, '');
  const contact = /^\d{7,15}$/.test(digits) ? digits : '';
  const evidence = [p.evidence_url_1, p.evidence_url_2].map((url, index) => ({ url, number: index + 1 })).filter(photo => photo.url);
  function save() { setNotice(toggle(p) ? '' : 'No pudimos guardar el cambio en este dispositivo.'); }
  async function share() {
    const url = `https://tumara-a.vercel.app/profesional/${encodeURIComponent(p.id)}`;
    try {
      if (navigator.share) { await navigator.share({ title: `${p.display_name} en TuMaraña`, url }); return; }
      if (!navigator.clipboard?.writeText) throw new Error('No clipboard');
      await navigator.clipboard.writeText(url);
      setNotice('Enlace del perfil copiado.');
    } catch (error) { if (error?.name !== 'AbortError') setNotice('No pudimos compartir el enlace. Inténtalo de nuevo.'); }
  }
  const tabs = [['info', 'Información'], ['services', 'Servicios'], ['reviews', 'Reseñas'], ['gallery', 'Galería']];
  return <section className="pro-screen pro-refresh">
    <div className="pro-hero">
      {p.photo_url && !photoFailed ? <button type="button" className="pro-portrait-open" aria-label={`Ampliar foto de ${p.display_name}`} onClick={() => setViewer({ photos: [{ url: p.photo_url, number: 1 }], index: 0 })}><img className="pro-portrait" src={p.photo_url} alt={p.display_name} onError={() => setPhotoFailed(true)} /></button> : <div className="pro-photo-placeholder"><AppIcon name="user" size={90} /><span>Profesional de TuMaraña</span></div>}
      {back}
      <div className="pro-hero-tools"><button type="button" className="pro-save-icon" aria-label={`${saved ? 'Quitar de' : 'Guardar en'} favoritos a ${p.display_name}`} aria-pressed={saved} onClick={save}><AppIcon name="heart" filled={saved} /></button><button type="button" className="pro-share-icon" aria-label="Compartir perfil" onClick={share}><AppIcon name="share" size={21} /></button></div>
      {p.verified && <span className="pro-verified">✓ Verificado</span>}
    </div>
    <div className="pro-summary">
      <div className="pro-title"><h1>{p.display_name}</h1></div>
      <p className="pro-rating"><span>★ {Number(p.rating || 0).toFixed(1)}</span> <span>({p.total_reviews || 0} reseñas)</span></p>
      <p className="pro-location"><AppIcon name="pin" size={14} />{[p.city, p.neighborhood].filter(Boolean).join(' · ') || 'Ubicación por confirmar'}<span className="pro-category-label">{p.category || 'Profesional de servicios'}</span></p>
      {notice && <p className="pro-notice" role="status">{notice}</p>}
    </div>
    <div className="pro-tabs" role="tablist" aria-label="Detalles del profesional">{tabs.map(([key, label]) => <button key={key} id={`pro-tab-${key}`} type="button" role="tab" aria-selected={tab === key} aria-controls={`pro-panel-${key}`} tabIndex={tab === key ? 0 : -1} onClick={() => setTab(key)} onKeyDown={event => {
      const index = tabs.findIndex(([value]) => value === tab);
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); setTab(tabs[next][0]); document.getElementById(`pro-tab-${tabs[next][0]}`)?.focus(); }
    }}>{label}</button>)}</div>
    <div id={`pro-panel-${tab}`} className="pro-content" role="tabpanel" aria-labelledby={`pro-tab-${tab}`} tabIndex={0}>
      {tab === 'info' && <>
        <h2>Sobre mí</h2><p>{p.description || 'Este profesional aún no ha añadido una descripción.'}</p>
        <div className="pro-highlights">
          <div><AppIcon name="calendar" size={29} /><strong>{p.experience_years != null ? `${p.experience_years} ${Number(p.experience_years) === 1 ? 'año' : 'años'}` : 'Por consultar'}</strong><span>de experiencia</span></div>
          <div><AppIcon name="chat" size={29} /><strong>Contacto</strong><span>desde la app</span></div>
          <div><AppIcon name={p.verified ? 'shield' : 'star'} size={29} /><strong>{p.verified ? 'Perfil' : `${p.total_reviews || 0} reseñas`}</strong><span>{p.verified ? 'verificado' : 'de clientes'}</span></div>
        </div>
        <ProfessionalServices professionalId={p.id} />
        {evidence.length > 0 && <section className="pro-gallery-preview"><div><h2>Trabajos realizados</h2><button type="button" onClick={() => setTab('gallery')}>Ver galería</button></div><div className="pro-gallery">{evidence.map(({ url, number }, index) => <WorkPhoto key={url} url={url} number={number} onOpen={() => setViewer({ photos: evidence, index })} />)}</div></section>}
        {contact && <div className="pro-direct-contact"><a href={`tel:+${contact}`}><AppIcon name="phone" size={17} />Llamar</a><a href={`https://wa.me/${contact}?text=${encodeURIComponent(`Hola ${p.display_name}, te contacto desde TuMaraña.com`)}`} target="_blank" rel="noopener noreferrer"><AppIcon name="chat" size={17} />WhatsApp</a></div>}
      </>}
      {tab === 'services' && <ProfessionalServices professionalId={p.id} />}
      {tab === 'reviews' && <><h2>Reseñas de clientes</h2>{reviewsState === 'loading' ? <p role="status">Cargando reseñas…</p> : reviewsState === 'error' ? <div role="alert"><p>No pudimos cargar las reseñas.</p><button className="pro-secondary" onClick={() => setReviewsRetry(value => value + 1)}>Reintentar reseñas</button></div> : reviews.length ? <div className="pro-reviews">{reviews.map((review, index) => { const rating = Math.max(0, Math.min(5, Math.round(Number(review.rating) || 0))); return <article key={review.id || index}><span className="pro-review-stars" aria-label={`${rating} de 5 estrellas`}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span><p>{review.comment || 'Este cliente dejó una calificación sin comentario.'}</p></article>; })}</div> : <p>Aún no hay reseñas publicadas para este profesional.</p>}</>}
      {tab === 'gallery' && <><h2>Trabajos realizados</h2>{evidence.length ? <div className="pro-gallery">{evidence.map(({ url, number }, index) => <WorkPhoto key={url} url={url} number={number} onOpen={() => setViewer({ photos: evidence, index })} />)}</div> : <p>Este profesional aún no ha publicado fotos de sus trabajos.</p>}</>}
    </div>
    {viewer !== null && <PhotoViewer photos={viewer.photos} initialIndex={viewer.index} onClose={() => setViewer(null)} />}
    {panel === 'chat' && <ProfileModal title="Conversar con el profesional" onClose={() => setPanel('')}><p className="pro-chat-explanation">Para iniciar la conversación, envía una solicitud de servicio. Podrás coordinar los detalles desde su chat.</p><Link className="pro-primary" to={requestTo}>Crear solicitud</Link></ProfileModal>}
    <div className="pro-request-bar"><button type="button" className="pro-chat-button" aria-haspopup="dialog" onClick={() => setPanel('chat')}><AppIcon name="chat" size={20} />Chat</button><Link className="pro-primary" to={requestTo}><AppIcon name="chat" size={20} />Contratar</Link></div>
  </section>;
}
