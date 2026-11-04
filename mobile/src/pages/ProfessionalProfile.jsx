import '../service-catalog.css';
import { ProfessionalServices } from '../components/ProfessionalServices';
import '../profile-refresh.css';
import { cleanPhotoFields } from '../lib/photoSource';
import { PhotoViewer } from '../components/PhotoViewer';
import { WorkPhoto } from '../components/WorkPhoto';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';
import { AppIcon, categoryAppearance } from '../components/AppIcon';
import { useLocalFavorites } from '../lib/useLocalFavorites';
import { profileColor, rememberProfileColor, storedProfileColor } from '../lib/profileColors';

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
  const [photoFailed, setPhotoFailed] = useState(false);
  const { has, toggle } = useLocalFavorites();
  useEffect(() => {
    let active = true;
    setViewer(null); setP(null); setError(false); setPhotoFailed(false); setTab('info'); setNotice('');
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
  const [categoryIcon] = categoryAppearance(p.category);
  const profileTone = profileColor(location.state?.profileTone || p.profile_color || storedProfileColor(p.id), p.id);
  rememberProfileColor(p.id, profileTone);
  const nearbyTo = `/buscar${p.city ? `?city=${encodeURIComponent(p.city)}` : ''}`;
  const discovery = [
    ['/categorias', 'grid', 'Categorías', 'blue'],
    ['/', 'bolt', 'Urgentes', 'red', { openPanel: 'urgent' }],
    ['/buscar?sort=rating', 'star', 'Mejor valorados', 'blue'],
    [nearbyTo, 'locate', 'Cerca de mí', 'green'],
    ['/', 'tag', 'Ofertas', 'purple', { openPanel: 'offers' }],
  ];
  const tabs = [['info', 'user', 'Perfil'], ['services', 'tools', 'Servicios'], ['reviews', 'star', 'Reseñas'], ['gallery', 'card', 'Galería']];
  return <section className={`pro-screen pro-refresh pro-profile-tone-${profileTone}`}>
    <header className="pro-profile-top">{back}<span>Perfil profesional</span></header>
    <nav className="pro-discovery-shortcuts" aria-label="Explorar servicios">{discovery.map(([to, icon, label, color, state]) => <Link key={label} to={to} state={state || { from: `/profesional/${p.id}` }} className={`pro-discovery-${color}`}><span><AppIcon name={icon} size={20} filled={['bolt', 'star', 'tag'].includes(icon)} /></span><strong>{label}</strong></Link>)}</nav>
    <div className="pro-identity-card">
      <button type="button" className="pro-identity-photo" aria-label={`Ampliar foto de ${p.display_name}`} disabled={!p.photo_url || photoFailed} onClick={() => setViewer({ photos: [{ url: p.photo_url, number: 1 }], index: 0 })}>{p.photo_url && !photoFailed ? <img src={p.photo_url} alt={p.display_name} onError={() => setPhotoFailed(true)} /> : <span>{p.display_name?.trim()[0] || 'P'}</span>}<i aria-hidden="true" /></button>
      <div className="pro-identity-copy">
        <div className="pro-identity-name"><h1>{p.display_name}</h1>{p.verified && <span className="pro-verified"><i aria-hidden="true">✓</i> Verificado</span>}</div>
        <p className="pro-identity-category">{p.category || 'Profesional de servicios'}</p>
        <div className="pro-identity-meta"><span><strong>★ {Number(p.rating || 0).toFixed(1)}</strong> ({p.total_reviews || 0} reseñas)</span><i aria-hidden="true" /><span><AppIcon name="pin" size={17} />{[p.city, p.neighborhood].filter(Boolean).join(' · ') || 'Ubicación por confirmar'}</span></div>
      </div>
      <span className="pro-identity-watermark" aria-hidden="true"><AppIcon name={categoryIcon} size={112} /></span>
      <div className="pro-hero-tools"><button type="button" className="pro-save-icon" aria-label={`${saved ? 'Quitar de' : 'Guardar en'} favoritos a ${p.display_name}`} aria-pressed={saved} onClick={save}><AppIcon name="heart" filled={saved} /></button><button type="button" className="pro-share-icon" aria-label="Compartir perfil" onClick={share}><AppIcon name="share" size={21} /></button></div>
    </div>
    {notice && <p className="pro-notice" role="status">{notice}</p>}
    <div className="pro-tabs" role="tablist" aria-label="Detalles del profesional">{tabs.map(([key, icon, label]) => <button key={key} id={`pro-tab-${key}`} type="button" role="tab" aria-selected={tab === key} aria-controls={`pro-panel-${key}`} tabIndex={tab === key ? 0 : -1} onClick={() => setTab(key)} onKeyDown={event => {
      const index = tabs.findIndex(([value]) => value === tab);
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); setTab(tabs[next][0]); document.getElementById(`pro-tab-${tabs[next][0]}`)?.focus(); }
    }}><AppIcon name={icon} size={19} filled={key === 'reviews' && tab === key} />{label}</button>)}</div>
    <div id={`pro-panel-${tab}`} className="pro-content" role="tabpanel" aria-labelledby={`pro-tab-${tab}`} tabIndex={0}>
      {tab === 'info' && <>
        <div className="pro-info-grid">
          <section className="pro-about-card"><h2><AppIcon name="user" size={22} />Sobre mí</h2><p>{p.description || 'Este profesional aún no ha añadido una descripción.'}</p><span><AppIcon name="calendar" size={17} />{p.experience_years != null ? `${p.experience_years} ${Number(p.experience_years) === 1 ? 'año' : 'años'} de experiencia` : 'Experiencia por consultar'}</span></section>
          <section className="pro-availability-card"><h2><AppIcon name="calendar" size={22} />Disponibilidad</h2><strong><i aria-hidden="true" />Consultar disponibilidad</strong><p>Coordina fecha y hora desde la aplicación.</p></section>
        </div>
        <ProfessionalServices professionalId={p.id} variant="chips" />
        {evidence.length > 0 && <section className="pro-gallery-preview"><div><h2>Trabajos realizados</h2><button type="button" onClick={() => setTab('gallery')}>Ver galería</button></div><div className="pro-gallery">{evidence.map(({ url, number }, index) => <WorkPhoto key={url} url={url} number={number} onOpen={() => setViewer({ photos: evidence, index })} />)}</div></section>}
      </>}
      {tab === 'services' && <ProfessionalServices professionalId={p.id} />}
      {tab === 'reviews' && <><h2>Reseñas de clientes</h2>{reviewsState === 'loading' ? <p role="status">Cargando reseñas…</p> : reviewsState === 'error' ? <div role="alert"><p>No pudimos cargar las reseñas.</p><button className="pro-secondary" onClick={() => setReviewsRetry(value => value + 1)}>Reintentar reseñas</button></div> : reviews.length ? <div className="pro-reviews">{reviews.map((review, index) => { const rating = Math.max(0, Math.min(5, Math.round(Number(review.rating) || 0))); return <article key={review.id || index}><span className="pro-review-stars" aria-label={`${rating} de 5 estrellas`}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span><p>{review.comment || 'Este cliente dejó una calificación sin comentario.'}</p></article>; })}</div> : <p>Aún no hay reseñas publicadas para este profesional.</p>}</>}
      {tab === 'gallery' && <><h2>Trabajos realizados</h2>{evidence.length ? <div className="pro-gallery">{evidence.map(({ url, number }, index) => <WorkPhoto key={url} url={url} number={number} onOpen={() => setViewer({ photos: evidence, index })} />)}</div> : <p>Este profesional aún no ha publicado fotos de sus trabajos.</p>}</>}
    </div>
    {viewer !== null && <PhotoViewer photos={viewer.photos} initialIndex={viewer.index} onClose={() => setViewer(null)} />}
    <div className="pro-request-bar"><Link className="pro-primary" to={requestTo}><AppIcon name="chat" size={24} />Contactar</Link></div>
  </section>;
}
