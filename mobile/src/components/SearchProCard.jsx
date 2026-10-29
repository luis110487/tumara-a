import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppIcon } from './AppIcon';
import { useLocalFavorites } from '../lib/useLocalFavorites';
import { photoSource } from '../lib/photoSource';

export function SearchProCard({ professional: p, backTo }) {
  const location = useLocation();
  const { has, toggle } = useLocalFavorites();
  const [error, setError] = useState(false);
  const [failedPhoto, setFailedPhoto] = useState('');
  const saved = has(p.id), photo = photoSource(p.photo_url);
  const to = `/profesional/${p.id}`;
  const state = { from: backTo, resultsFrom: location.state?.from || '/' };
  const tags = [p.category, p.neighborhood].filter(value => typeof value === 'string' && value.trim());
  return <article className="result-pro-card">
    <Link className="result-pro-main" to={to} state={state} aria-label={`Ver perfil de ${p.display_name}`}>
      {photo && failedPhoto !== photo ? <img className="result-pro-avatar" src={photo} alt="" loading="lazy" onError={() => setFailedPhoto(photo)} /> : <span className="result-pro-avatar result-pro-initial" aria-hidden="true">{p.display_name?.trim()[0] || 'P'}</span>}
      <div className="result-pro-info"><h2>{p.display_name}</h2><p className="result-pro-rating"><AppIcon name="star" size={16} filled /><strong>{Number(p.rating || 0).toFixed(1)}</strong><span>({Number(p.total_reviews || 0)})</span></p><p className="result-pro-city"><AppIcon name="pin" size={12} />{p.city || 'Consultar ubicación'}</p></div>
    </Link>
    <button type="button" className="result-pro-save" aria-label={`${saved ? 'Quitar de' : 'Guardar en'} favoritos a ${p.display_name}`} aria-pressed={saved} onClick={() => setError(!toggle(p))}><AppIcon name="heart" size={21} filled={saved} /></button>
    <div className="result-pro-footer"><div className="result-pro-labels">{p.verified && <span className="result-pro-verified">✓ Verificado</span>}<div className="result-pro-tags">{tags.map(tag => <span key={tag}>{tag}</span>)}</div></div><Link className="result-pro-open" to={to} state={state}>Ver perfil<span className="home-sr-only"> de {p.display_name}</span></Link></div>
    {error && <p className="home-save-error" role="alert">No pudimos guardar el cambio en este dispositivo.</p>}
  </article>;
}
