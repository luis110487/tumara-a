import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetchPublic } from '../lib/apiClient';

const feature = { id: 'home-feature', feature: true, title: 'Hogar en buenas manos' };
function safeLink(value) {
  if (typeof value !== 'string') return '';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}

export function BannerAd({ homeFeature = false }) {
  const [banners, setBanners] = useState(homeFeature ? [feature] : []);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    let alive = true;
    apiFetchPublic('/api/banners').then(data => {
      if (alive) setBanners([...(homeFeature ? [feature] : []), ...(Array.isArray(data) ? data.filter(item => safeLink(item.image_url) && item.is_active !== false) : [])]);
    }).catch(() => {});
    return () => { alive = false; };
  }, [homeFeature]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setHidden(document.hidden || media.matches);
    change(); document.addEventListener('visibilitychange', change); media.addEventListener('change', change);
    return () => { document.removeEventListener('visibilitychange', change); media.removeEventListener('change', change); };
  }, []);
  useEffect(() => {
    if (banners.length < 2 || paused || hidden) return;
    const timer = setTimeout(() => setIndex(value => (value + 1) % banners.length), 5000);
    return () => clearTimeout(timer);
  }, [index, banners.length, paused, hidden]);
  if (!banners.length) return null;
  const current = banners[index % banners.length], link = safeLink(current.link);
  return <section className={`tm-banner-ad${homeFeature ? ' home-banner-feature' : ''}`} aria-label="Novedades y promociones" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    {current.feature ? <Link className="home-brand-banner" to="/buscar?verified=1" state={{ from: '/' }}>
      <img src="/home-house.png" alt="" /><span><strong>Hogar en buenas manos</strong><small>Encuentra profesionales<br />para lo que necesitas.</small></span><b aria-hidden="true">›</b>
    </Link> : <div className="tm-banner-container"><img src={current.image_url} alt={current.title || 'Promoción'} className="tm-banner-image" onError={() => { setBanners(rows => rows.filter(row => row.id !== current.id)); setIndex(0); }} />{link && (link.startsWith('/') ? <Link to={link} className="tm-banner-link" aria-label={current.title || 'Ver promoción'} /> : <a href={link} className="tm-banner-link" aria-label={current.title || 'Ver promoción'} target="_blank" rel="noopener noreferrer" />)}</div>}
    {banners.length > 1 && <div className="tm-banner-controls">
      <button className="tm-banner-btn tm-prev" type="button" aria-label="Banner anterior" onClick={() => setIndex(value => (value - 1 + banners.length) % banners.length)}>‹</button>
      <div className="tm-banner-dots">{banners.map((item, position) => <button key={item.id} type="button" className={`tm-dot${position === index % banners.length ? ' active' : ''}`} aria-label={`Banner ${position + 1}`} aria-current={position === index % banners.length ? 'true' : undefined} onClick={() => setIndex(position)} />)}</div>
      <button className="tm-banner-btn tm-next" type="button" aria-label="Banner siguiente" onClick={() => setIndex(value => (value + 1) % banners.length)}>›</button>
    </div>}
  </section>;
}
