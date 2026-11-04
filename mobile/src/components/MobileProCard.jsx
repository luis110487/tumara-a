import { photoSource } from '../lib/photoSource';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppIcon, categoryAppearance, professionalToolIcon } from './AppIcon';
import { useLocalFavorites } from '../lib/useLocalFavorites';
import { profileColor, rememberProfileColor, storedProfileColor } from '../lib/profileColors';

export function MobileProCard({ professional: p, backTo, tone = 0 }) {
  const location = useLocation();
  const { has, toggle } = useLocalFavorites();
  const [error, setError] = useState(false);
  const saved = has(p.id);
  const isVerified = Boolean(p.verified ?? p.is_verified);
  const photo = photoSource(p.photo_url);
  const [failedPhoto, setFailedPhoto] = useState('');
  const [categoryIcon] = categoryAppearance(p.category);
  const watermarkIcon = professionalToolIcon([p.category, p.occupation, p.service_name].filter(Boolean).join(' '));
  const tones = ['blue', 'green', 'orange', 'purple'];
  const selectedTone = profileColor(p.profile_color || storedProfileColor(p.id), p.id || tone);
  rememberProfileColor(p.id, selectedTone);
  const profileState = { from: backTo || location.pathname + location.search, resultsFrom: location.state?.from || '/', profileTone: selectedTone };
  const tags = [p.category, p.neighborhood].filter(value => typeof value === 'string' && value.trim()).slice(0, 2);
  return <article className={`home-pro-card home-pro-card-${tones.includes(selectedTone) ? selectedTone : tones[Math.abs(Number(tone) || 0) % tones.length]}`}>
    <Link to={`/profesional/${p.id}`} state={profileState} className="home-pro-detail">
      <span className="home-pro-avatar-wrap">
        {photo && failedPhoto !== photo ? <img className="home-pro-avatar" src={photo} alt="" loading="lazy" onError={() => setFailedPhoto(photo)} /> : <span className="home-pro-initial">{p.display_name?.trim()[0] || 'P'}</span>}
        <i className="home-pro-online" aria-hidden="true" />
      </span>
      <div className="home-pro-info"><h3><span>{p.display_name}</span>{isVerified && <b className="home-pro-verified"><i aria-hidden="true">✓</i> Verificado</b>}</h3><p className="home-pro-category">{p.category || 'Profesional de servicios'}</p>
        <div className="home-pro-meta"><span className="home-pro-rating"><strong>★ {Number(p.rating || 0).toFixed(1)}</strong><small>({p.total_reviews || 0})</small></span><i aria-hidden="true" /><span className="home-pro-city"><AppIcon name="pin" size={15} />{p.city || 'Consultar ubicación'}</span></div>
        {tags.length > 0 && <div className="home-pro-tags">{tags.map((tag, index) => <span key={`${tag}-${index}`}><AppIcon name={index ? 'pin' : categoryIcon} size={14} />{tag}</span>)}</div>}
      </div>
      <span className="home-pro-watermark" aria-hidden="true"><AppIcon name={watermarkIcon} size={104} /></span>
    </Link>
    <Link className="home-pro-contact" to={`/profesional/${p.id}`} state={profileState}><AppIcon name="phone" size={18} />Contactar</Link>
    <button type="button" className="home-save" aria-label={`${saved ? 'Quitar de' : 'Guardar en'} favoritos a ${p.display_name}`}
      aria-pressed={saved} onClick={() => setError(!toggle(p))}><AppIcon name="heart" size={20} filled={saved} /></button>
    {error && <p className="home-save-error" role="alert">No pudimos guardar el cambio en este dispositivo.</p>}
  </article>;
}
